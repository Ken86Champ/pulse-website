'use strict';
const Stripe = require('stripe');
const { config, db, reply } = require('../lib/onboarding-server');
const { cancelTrial, registerSession } = require('../lib/pulse-trial');
module.exports = async function(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Methode nicht erlaubt' });
  try {
    const { stripeKey, mode, origin } = config();
    if (req.headers.origin !== origin) return reply(res, 403, { error: 'Ungültiger Ursprung' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '') || Buffer.byteLength(JSON.stringify(req.body ?? {})) > 1024) return reply(res, 400, { error: 'Ungültige Eingabe' });
    const id = req.body?.session_id;
    if (typeof id !== 'string' || !new RegExp(`^cs_${mode}_[A-Za-z0-9]{15,200}$`).test(id)) return reply(res, 400, { error: 'Ungültige Sitzung' });
    const [trial] = await db('pulse_trials', `select=*&stripe_checkout_session_id=eq.${id}&mode=eq.${mode}&limit=1`);
    if (!trial) return reply(res, 404, { error: 'Testanmeldung nicht gefunden' });
    const stripe = new Stripe(stripeKey, { maxNetworkRetries: 1, timeout: 8000 });
    if (trial.status === 'awaiting_setup') {
      let session = await stripe.checkout.sessions.retrieve(id);
      if (session.status === 'open') {
        try { session = await stripe.checkout.sessions.expire(id); }
        catch(error) { session = await stripe.checkout.sessions.retrieve(id); if (session.status === 'open') throw error; }
      }
      if (session.status === 'complete') {
        await registerSession(session, mode, stripe);
        const [updated] = await db('pulse_trials', `select=*&id=eq.${trial.id}`);
        return reply(res, 200, await cancelTrial(updated, stripe));
      }
      await db('rpc/pulse_cancel_trial', '', 'POST', { p_id: trial.id, p_session: id });
      return reply(res, 200, { status: 'cancelled' });
    }
    return reply(res, 200, await cancelTrial(trial, stripe));
  } catch(error) {
    console.error('pulse_testkuendigung_fehlgeschlagen', error.type || error.name);
    return reply(res, 503, { error: 'Kündigung noch nicht bestätigt. Bitte Support kontaktieren.' });
  }
};
