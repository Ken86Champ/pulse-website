const { createHmac } = require('node:crypto');
const Stripe = require('stripe');
const { validate, db, checkoutConfig, reply, encryptHealthData, UUID, CONSENT_VERSION, InvalidRequest } = require('../lib/onboarding-server');

module.exports = async function (req, res) {
  if (req.method === 'GET') {
    if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 200, { available: false });
    try {
      checkoutConfig();
      return reply(res, 200, { available: true });
    } catch {
      return reply(res, 200, { available: false });
    }
  }
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });
  if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { error: 'Checkout not enabled' });

  try {
    const { stripeKey, mode, price, tenant, origin, encryptionKey } = checkoutConfig();
    if (req.headers.origin !== origin) return reply(res, 403, { error: 'Invalid origin' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
      return reply(res, 415, { error: 'JSON required' });
    }
    if (Number(req.headers['content-length'] || 0) > 32768 || Buffer.byteLength(JSON.stringify(req.body ?? {})) > 32768) {
      return reply(res, 413, { error: 'Payload too large' });
    }
    const { answers: rawAnswers, consentVersion, attemptId, locale } = req.body ?? {};
    if (consentVersion !== CONSENT_VERSION || typeof attemptId !== 'string' || !UUID.test(attemptId)
      || !['de', 'en', 'fr', 'it', 'es'].includes(locale)) throw new InvalidRequest('Invalid checkout request');
    const answers = validate(rawAnswers);
    const fingerprint = createHmac('sha256', encryptionKey).update(JSON.stringify([answers, locale, mode, tenant, price, origin, consentVersion])).digest('hex');
    const stripe = new Stripe(stripeKey, { maxNetworkRetries: 1, timeout: 8000 });
    const source = req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const bucket = createHmac('sha256', encryptionKey).update(`checkout-ip:${source}`).digest('hex');
    const allowed = await db('rpc/pulse_allow_checkout', '', 'POST', { p_bucket: bucket });
    if (!allowed) return reply(res, 429, { error: 'Too many checkout attempts' });

    const productPrice = await stripe.prices.retrieve(price);
    if (!productPrice.active || productPrice.livemode !== (mode === 'live') || productPrice.currency !== 'chf'
        || productPrice.unit_amount !== 9800 || productPrice.recurring?.interval !== 'month'
        || productPrice.recurring.interval_count !== 1 || productPrice.recurring.usage_type !== 'licensed') {
      throw new Error('Configured Stripe price is not an active CHF 98 monthly price');
    }

    const pending = await db('pulse_checkout_pending',
      `select=attempt_fingerprint,status,stripe_checkout_session_id&id=eq.${attemptId}`);
    if (pending[0] && (pending[0].attempt_fingerprint !== fingerprint || pending[0].status !== 'awaiting_payment')) {
      return reply(res, 409, { error: 'Checkout attempt no longer available' });
    }

    const cipher = encryptHealthData(answers, attemptId);
    const session = pending[0]
      ? await stripe.checkout.sessions.retrieve(pending[0].stripe_checkout_session_id)
      : await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        adaptive_pricing: { enabled: false },
        customer_email: answers.email,
        client_reference_id: attemptId,
        metadata: { pulse_flow: 'onboarding_v1', pulse_pending_id: attemptId },
        locale,
        success_url: `${origin}/onboarding-success.html?lang=${locale}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/onboarding.html?lang=${locale}#cancelled=${attemptId}`
      }, { idempotencyKey: `pulse_checkout_${attemptId}` });

    if (session.status !== 'open' || !session.url || new URL(session.url).origin !== 'https://checkout.stripe.com') {
      return reply(res, 409, { error: 'Checkout attempt no longer available' });
    }
    if (!pending[0]) {
      await db('rpc/pulse_save_checkout', '', 'POST', {
        p_id: attemptId, p_tenant: tenant, p_email: answers.email, p_session: session.id,
        p_answers: cipher, p_consent: consentVersion, p_fingerprint: fingerprint
      });
    }
    return reply(res, 200, { checkoutUrl: session.url });
  } catch (error) {
    if (error instanceof InvalidRequest) return reply(res, 400, { error: error.message });
    if (error.type === 'StripeIdempotencyError') return reply(res, 409, { error: 'Checkout attempt in progress or already used' });
    console.error('PULSE checkout unavailable', error.type || error.name);
    return reply(res, 503, { error: 'Checkout temporarily unavailable' });
  }
};
