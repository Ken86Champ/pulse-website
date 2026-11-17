// Staging-only: paid invitation -> validated submission with separately encrypted health answers.
// This endpoint is deliberately gated until the migration, secrets and E2E tests are complete.
const crypto = require('node:crypto');
const { encryptHealthData } = require('../lib/health-encryption');
const HEALTH = new Set('medicalTreatment medicalTreatmentDetails medication medicationDetails heart heartDetails musculoskeletal musculoskeletalDetails respiratory respiratoryDetails metabolic metabolicDetails surgery surgeryDetails otherHealth otherHealthDetails smoking'.split(' '));
const FIELDS = new Set('firstName lastName email phone street postal city country birthDate sex height weight job activity goal targetWeight motivation challenge challengeOther currentTraining plannedTraining days weeklyTime location gymMember equipment equipmentOther duration experience diet dietStyle dietStyleOther dietRules dietRulesOther allergyTypes allergies foodDislikes medicalTreatment medicalTreatmentDetails medication medicationDetails heart heartDetails musculoskeletal musculoskeletalDetails respiratory respiratoryDetails metabolic metabolicDetails surgery surgeryDetails otherHealth otherHealthDetails smoking source sourceDetails confirmation'.split(' '));
const LISTS = new Set('challenge days location equipment dietRules allergyTypes'.split(' '));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const send = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
function validate(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Invalid answers');
  const plain = {}, health = {};
  for (const [field, value] of Object.entries(answers)) {
    if (!FIELDS.has(field)) throw new Error('Unknown field');
    if (LISTS.has(field)) {
      if (!Array.isArray(value) || value.length > 25 || value.some(x => typeof x !== 'string' || x.length > 160)) throw new Error('Invalid selection');
    } else if (field === 'confirmation') {
      if (value !== true) throw new Error('Consent confirmation required');
    } else if (typeof value !== 'string' || value.length > 1500) throw new Error('Invalid field value');
    (HEALTH.has(field) ? health : plain)[field] = value;
  }
  if (!plain.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(plain.email) || !plain.firstName || !plain.lastName || plain.confirmation !== true) throw new Error('Required fields missing');
  for (const key of ['medicalTreatment','medication','heart','musculoskeletal','respiratory','metabolic','surgery','otherHealth']) {
    if (!['Ja','Nein'].includes(health[key])) throw new Error('Missing health answer');
    if (health[key] === 'Ja' && !String(health[key+'Details'] || '').trim()) throw new Error('Missing health follow-up');
    if (health[key] !== 'Ja') health[key+'Details'] = '';
  }
  return { plain, health };
}
async function db(table, query, options={}) {
  const url = process.env.PULSE_ONBOARDING_SUPABASE_URL;
  const secret = process.env.PULSE_ONBOARDING_SUPABASE_SECRET_KEY;
  if (!url || !secret || !/^https:\/\//.test(url)) throw new Error('Database unavailable');
  const response = await fetch(url.replace(/\/$/,'') + '/rest/v1/' + table + '?' + query, {
    method: options.method || 'GET',
    headers: { apikey:secret, Authorization:'Bearer '+secret, 'Content-Type':'application/json', Prefer:'return=representation' },
    ...(options.body ? { body:JSON.stringify(options.body) } : {})
  });
  if (!response.ok) throw new Error('Database operation failed');
  return response.json();
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res,405,{error:'Method not allowed'});
  if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return send(res,503,{error:'Secure onboarding not enabled'});
  try {
    const size = Number(req.headers['content-length'] || 0);
    if (size > 32768) return send(res,413,{error:'Request too large'});
    const origin = req.headers.origin;
    const expected = process.env.PULSE_PUBLIC_ORIGIN;
    if (!expected || origin !== expected) return send(res,403,{error:'Invalid origin'});
    const {token,answers,consentVersion} = req.body || {};
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) return send(res,400,{error:'Invalid invitation'});
    if (consentVersion !== 'pulse-privacy-v1') return send(res,400,{error:'Consent version required'});
    const {plain,health} = validate(answers);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invites = await db('pulse_onboarding_invites','select=id,tenant_id,email,expires_at,completed_at,stripe_checkout_session_id&token_hash=eq.'+tokenHash+'&limit=1');
    const invite = invites[0];
    if (!invite || invite.completed_at || Date.parse(invite.expires_at) <= Date.now() || invite.email.toLowerCase() !== plain.email.trim().toLowerCase()) return send(res,403,{error:'Invitation invalid or expired'});
    // Verify paid subscription against Stripe, not browser-controlled claims.
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.PULSE_STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(invite.stripe_checkout_session_id);
    if (session.payment_status !== 'paid' || session.mode !== 'subscription' || !session.subscription) return send(res,403,{error:'Payment not confirmed'});
    // Invite UUID is immutable and unique. No plaintext health fields enter answers.
    if (!UUID.test(invite.id) || !UUID.test(invite.tenant_id)) throw new Error('Invalid invitation record');
    const encrypted = encryptHealthData(health, invite.id);
    const rows = await db('pulse_onboarding_submissions','on_conflict=invite_id',{
      method:'POST',body:{invite_id:invite.id,tenant_id:invite.tenant_id,answers:plain,health_encrypted:encrypted,status:'coaching_setup_required',consent_version:consentVersion}
    });
    // Fail-closed: if unique invite already exists, return conflict rather than overwrite.
    if (!rows.length) throw new Error('Submission not persisted');
    await db('pulse_onboarding_invites','id=eq.'+invite.id+'&completed_at=is.null',{method:'PATCH',body:{completed_at:new Date().toISOString()}});
    return send(res,201,{ok:true,submissionId:rows[0].id});
  } catch (error) {
    if (error.message && /Invalid|Unknown|Required|Missing|Consent/.test(error.message)) return send(res,400,{error:error.message});
    return send(res,503,{error:'Submission unavailable'});
  }
};
