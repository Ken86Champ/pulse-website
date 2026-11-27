'use strict';
const Stripe = require('stripe');
const { reply, UUID } = require('../lib/onboarding-server');
const { trialConfig, verifySignature, startTrial } = require('../lib/pulse-trial');
module.exports = async function(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Methode nicht erlaubt' });
  try {
    const settings = trialConfig(), raw = JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw) > 1024) return reply(res, 413, { error: 'Eingabe zu gross' });
    if (!verifySignature(raw, req.headers['x-pulse-timestamp'], req.headers['x-pulse-signature'], settings.encryptionKey)) return reply(res, 401, { error: 'Nicht autorisiert' });
    const { trialId, appCustomerId } = req.body;
    if (!UUID.test(trialId || '') || !UUID.test(appCustomerId || '')) return reply(res, 400, { error: 'Ungültige Zuordnung' });
    const stripe = new Stripe(settings.stripeKey, { maxNetworkRetries: 1, timeout: 8000 });
    return reply(res, 200, await startTrial(trialId, appCustomerId, stripe, settings));
  } catch(error) {
    console.error('pulse_teststart_fehlgeschlagen', error.type || error.name);
    return reply(res, 503, { error: 'Teststart wird erneut versucht' });
  }
};
