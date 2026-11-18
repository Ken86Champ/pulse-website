const { groups, countryCodes, consentVersion, latestEligibleBirthDate } = require('../onboarding-schema');
const { encryptHealthData } = require('./health-encryption');

const fields = groups.flatMap(group => group.fields);
const allowed = new Set(fields.map(([id]) => id));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FOLLOWUPS = ['followup', 'followupOther', 'followupMulti'];
const NONE = ['Keine', 'Keine besonderen Regeln', 'Keines'];
const CONSENT_VERSION = consentVersion;

class InvalidRequest extends Error {}

function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InvalidRequest('Invalid answers');
  if (Object.keys(raw).some(key => !allowed.has(key))) throw new InvalidRequest('Unknown field');

  const answers = {};
  for (const [id, , type, first, second] of fields) {
    const value = raw[id];
    const locations = answers.location ?? [];
    if (id === 'gymMember' && !locations.includes('Fitnessstudio')) {
      answers[id] = '';
      continue;
    }
    if (id === 'equipment' && locations.every(location => location === 'Fitnessstudio')) {
      answers[id] = [];
      continue;
    }
    if (FOLLOWUPS.includes(type)) {
      const selected = answers[first];
      const relevant = type === 'followupMulti'
        ? selected?.includes(second)
        : selected === (type === 'followup' ? 'Ja' : second);
      if (!relevant) {
        answers[id] = '';
        continue;
      }
    }
    if (type === 'checkbox') {
      if (value !== true) throw new InvalidRequest(`Explicit consent required: ${id}`);
      answers[id] = true;
      continue;
    }
    if (type === 'multi' || type === 'equipment') {
      if (!Array.isArray(value) || !value.length || value.some(item => !first.includes(item))
        || new Set(value).size !== value.length || (value.length > 1 && value.some(item => NONE.includes(item)))) {
        throw new InvalidRequest(`Invalid selection: ${id}`);
      }
      answers[id] = value;
      continue;
    }

    const optional = type === 'optionalText' || type === 'optionalNumber';
    const text = typeof value === 'string' ? value.trim() : '';
    if ((!text && !optional) || (value !== undefined && typeof value !== 'string') || text.length > 1000) {
      throw new InvalidRequest(`Invalid value: ${id}`);
    }
    if (text) validateField(id, type, text, first, second);
    answers[id] = id === 'email' ? text.toLowerCase() : text;
  }
  return answers;
}

function validateField(id, type, value, first, second) {
  const invalid = () => { throw new InvalidRequest(`Invalid value: ${id}`); };
  if (type === 'select' && !first.includes(value)) invalid();
  if (type === 'country' && !countryCodes.includes(value)) invalid();
  if (type === 'email' && (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) invalid();
  if (type === 'tel' && (!/^[+0-9 ()-]{7,25}$/.test(value) || value.replace(/\D/g, '').length < 7)) invalid();
  if ((type === 'number' || type === 'optionalNumber') &&
    (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) < first || Number(value) > second)) invalid();
  if (type === 'date') {
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime())
      || date.toISOString().slice(0, 10) !== value || value > latestEligibleBirthDate() || Number(value.slice(0, 4)) < 1900) invalid();
  }
}

function env(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

function config() {
  const stripeKey = env('PULSE_STRIPE_SECRET_KEY');
  const mode = env('PULSE_STRIPE_MODE');
  const tenant = env('PULSE_B2C_TENANT_ID');
  const price = env('PULSE_STRIPE_PRICE_ID');
  const origin = env('PULSE_PUBLIC_ORIGIN');
  if (!['test', 'live'].includes(mode) || !new RegExp(`^(sk|rk)_${mode}_`).test(stripeKey)) {
    throw new Error('Stripe key and mode do not match');
  }
  if (!UUID.test(tenant) || !/^price_[A-Za-z0-9]+$/.test(price) || new URL(origin).origin !== origin
    || (mode === 'live' && !origin.startsWith('https://'))) throw new Error('Invalid checkout configuration');
  return { stripeKey, mode, tenant, price, origin };
}

function checkoutConfig() {
  const settings = config();
  if (process.env.VERCEL_ENV === 'production' && settings.mode !== 'live') {
    throw new Error('Production checkout requires live Stripe');
  }
  const encryptionKey = env('PULSE_HEALTH_DATA_KEY');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encryptionKey)) throw new Error('Invalid encryption configuration');
  env('PULSE_ONBOARDING_SUPABASE_URL');
  env('PULSE_ONBOARDING_SUPABASE_SECRET_KEY');
  const signingSecret = env(settings.mode === 'live' ? 'PULSE_STRIPE_LIVE_WEBHOOK_SECRET' : 'PULSE_STRIPE_WEBHOOK_SECRET');
  if (!signingSecret.startsWith('whsec_')
    || (settings.mode === 'live' && signingSecret === process.env.PULSE_STRIPE_WEBHOOK_SECRET)) {
    throw new Error('Invalid Stripe webhook configuration');
  }
  if (process.env.PULSE_NOTIFY_RESEND_API_KEY?.trim()) {
    ['PULSE_NOTIFY_FROM', 'PULSE_NOTIFY_TO'].forEach(env);
  }
  return { ...settings, encryptionKey };
}

async function db(path, params = '', method = 'GET', body) {
  const url = env('PULSE_ONBOARDING_SUPABASE_URL').replace(/\/$/, '');
  if (!url.startsWith('https://')) throw new Error('Invalid database URL');
  const key = env('PULSE_ONBOARDING_SUPABASE_SECRET_KEY');
  // New sb_secret keys authenticate via apikey. JWT service_role keys support Bearer.
  const authorization = key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` };
  const response = await fetch(`${url}/rest/v1/${path}${params ? `?${params}` : ''}`, {
    method,
    headers: { apikey: key, ...authorization, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Database operation failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

function reply(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(data);
}

module.exports = { validate, db, env, config, checkoutConfig, reply, encryptHealthData, UUID, CONSENT_VERSION, InvalidRequest };
