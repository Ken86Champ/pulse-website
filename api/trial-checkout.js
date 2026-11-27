'use strict';
const Stripe = require('stripe');
const { createHmac } = require('node:crypto');
const { validate, db, reply, encryptHealthData, UUID, InvalidRequest } = require('../lib/onboarding-server');
const { FLOW, CONSENT, trialConfig, validPrice } = require('../lib/pulse-trial');

module.exports = async function(req, res) {
  if (req.method === 'GET') {
    try { trialConfig(); return reply(res, 200, { available: true }); }
    catch { return reply(res, 200, { available: false }); }
  }
  if (req.method !== 'POST') return reply(res, 405, { error: 'Methode nicht erlaubt' });
  try {
    const settings = trialConfig();
    if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { error: 'Teststart noch nicht freigeschaltet' });
    if (req.headers.origin !== settings.origin) return reply(res, 403, { error: 'Ungültiger Ursprung' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(res, 415, { error: 'JSON erforderlich' });
    if (Buffer.byteLength(JSON.stringify(req.body ?? {})) > 32768) return reply(res, 413, { error: 'Eingabe zu gross' });
    const { answers: raw, consentVersion, attemptId, locale } = req.body ?? {};
    if (consentVersion !== CONSENT || !UUID.test(attemptId || '') || !['de','en','fr','it','es'].includes(locale)) throw new InvalidRequest('Testbedingungen bitte erneut bestätigen');
    const answers = validate(raw);
    const source = req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (!await db('rpc/pulse_allow_checkout', '', 'POST', { p_bucket: createHmac('sha256', settings.encryptionKey).update(`trial:${source}`).digest('hex') })) return reply(res, 429, { error: 'Zu viele Versuche' });
    const fingerprint = createHmac('sha256', settings.encryptionKey).update(JSON.stringify([answers, locale, settings.mode, settings.tenant, settings.price, CONSENT])).digest('hex');
    const [pending] = await db('pulse_trials', `select=attempt_fingerprint,status,stripe_checkout_session_id&id=eq.${attemptId}`);
    if (pending && (pending.attempt_fingerprint !== fingerprint || pending.status !== 'awaiting_setup')) return reply(res, 409, { error: 'Anmeldung bereits verwendet' });
    const stripe = new Stripe(settings.stripeKey, { maxNetworkRetries: 1, timeout: 8000 });
    if (!validPrice(await stripe.prices.retrieve(settings.price), settings.mode)) throw new Error('Monatspreis stimmt nicht');
    let session;
    if (pending) session = await stripe.checkout.sessions.retrieve(pending.stripe_checkout_session_id);
    else {
      const customer = await stripe.customers.create({ email: answers.email, metadata: { pulse_flow: FLOW, pulse_pending_id: attemptId } }, { idempotencyKey: `pulse_trial_customer_${attemptId}` });
      session = await stripe.checkout.sessions.create({
        mode: 'setup', currency: 'chf', customer: customer.id, locale,
        client_reference_id: attemptId, metadata: { pulse_flow: FLOW, pulse_pending_id: attemptId },
        setup_intent_data: { metadata: { pulse_flow: FLOW, pulse_pending_id: attemptId } },
        custom_text: { submit: { message: '7 Tage kostenlos ab bereitgestelltem Coaching-Zugang. Danach CHF 98/Monat. Vor Testende kündbar; heute keine Abbuchung.' } },
        success_url: `${settings.origin}/onboarding-success.html?flow=trial&lang=${locale}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${settings.origin}/onboarding.html?flow=trial&lang=${locale}#cancelled=${attemptId}`
      }, { idempotencyKey: `pulse_trial_checkout_${attemptId}` });
      await db('pulse_trials', '', 'POST', {
        id: attemptId, tenant_id: settings.tenant, email: answers.email, stripe_checkout_session_id: session.id,
        mode: settings.mode, price_id: settings.price, locale, consent_version: CONSENT,
        encrypted_answers: encryptHealthData(answers, attemptId), attempt_fingerprint: fingerprint
      });
    }
    if (session.status !== 'open' || !session.url || new URL(session.url).origin !== 'https://checkout.stripe.com') return reply(res, 409, { error: 'Anmeldung nicht mehr offen' });
    return reply(res, 200, { checkoutUrl: session.url });
  } catch(error) {
    if (error instanceof InvalidRequest) return reply(res, 400, { error: error.message });
    if (error.type === 'StripeIdempotencyError') return reply(res, 409, { error: 'Anmeldung wird bereits verarbeitet' });
    console.error('pulse_testanmeldung_fehlgeschlagen', error.type || error.name);
    return reply(res, 503, { error: 'Gratis-Test momentan nicht verfügbar' });
  }
};
