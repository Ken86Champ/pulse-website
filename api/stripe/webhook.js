const Stripe = require('stripe');
const { randomBytes, createHash } = require('node:crypto');
const { db, config, reply } = require('../../lib/onboarding-server');
const { fulfill } = require('../../lib/pulse-fulfillment');

async function provision(session, stripe) {
  const tenant = process.env.PULSE_ONBOARDING_TENANT_ID;
  if (!tenant) throw new Error('Onboarding configuration incomplete');
  const full = await stripe.checkout.sessions.retrieve(session.id);
  if (full.mode !== 'subscription' || full.payment_status !== 'paid') return { skipped: true };
  const email = full.customer_details?.email || full.customer_email;
  if (!email || !full.customer || !full.subscription) throw new Error('Checkout missing customer information');
  const existing = await db('pulse_onboarding_invites', 'select=id&stripe_checkout_session_id=eq.' + encodeURIComponent(full.id));
  if (existing.length) return { existing: true };
  const token = randomBytes(32).toString('hex');
  await db('pulse_onboarding_invites', '', 'POST', {
    tenant_id: tenant,
    email,
    stripe_checkout_session_id: full.id,
    stripe_customer_id: full.customer,
    stripe_subscription_id: full.subscription,
    token_hash: createHash('sha256').update(token).digest('hex'),
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString()
  }).catch(error => {
    if (error.message !== 'Database operation failed: 409') throw error;
  });
  // Invite delivery must be implemented before enabling provisioning.
  return { created: true, delivery_pending: true };
}

function verifiedStripeEvent(body, signature, webhookSecret, liveWebhookSecret) {
  if (liveWebhookSecret) {
    try {
      const event = Stripe.webhooks.constructEvent(body, signature, liveWebhookSecret);
      return event.livemode === true ? event : null;
    } catch {
      // The public endpoint also receives Stripe sandbox events signed with the existing secret.
    }
  }
  if (!webhookSecret) return null;
  const event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
  return liveWebhookSecret && event.livemode !== false ? null : event;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed' });
  }
  const secretKey = process.env.PULSE_STRIPE_SECRET_KEY;
  const webhookSecret = process.env.PULSE_STRIPE_WEBHOOK_SECRET;
  const liveWebhookSecret = process.env.PULSE_STRIPE_LIVE_WEBHOOK_SECRET;
  if ((!webhookSecret && !liveWebhookSecret) || (liveWebhookSecret && liveWebhookSecret === webhookSecret)) {
    return reply(res, 503, { error: 'Webhook not configured' });
  }
  let event;
  try {
    const chunks = [];
    let length = 0;
    for await (const chunk of req) {
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > 1048576) return reply(res, 413, { error: 'Webhook payload too large' });
      chunks.push(bytes);
    }
    event = verifiedStripeEvent(Buffer.concat(chunks), req.headers['stripe-signature'], webhookSecret, liveWebhookSecret);
    if (!event) return reply(res, 400, { error: 'Unexpected Stripe mode' });
  } catch {
    return reply(res, 400, { error: 'Invalid webhook signature' });
  }

  if (liveWebhookSecret && process.env.PULSE_STRIPE_MODE === 'live' && event.livemode === false) {
    return reply(res, 200, { received: true, ignored: true });
  }
  const stripe = secretKey && new Stripe(secretKey, { maxNetworkRetries: 1, timeout: 8000 });
  const secure = event.data.object.metadata?.pulse_flow === 'onboarding_v1';
  try {
    if (secure || (event.type === 'customer.subscription.deleted' && process.env.PULSE_SECURE_ONBOARDING_ENABLED === 'true')) {
      if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { error: 'Checkout temporarily paused' });
      const { mode } = config();
      if (mode === 'live' && !liveWebhookSecret) return reply(res, 503, { error: 'Live webhook not configured' });
      if (event.livemode !== (mode === 'live')) return reply(res, 400, { error: 'Unexpected Stripe mode' });
      await fulfill(event, mode, stripe);
      return reply(res, 200, { received: true });
    }

    if (process.env.PULSE_ONBOARDING_PROVISIONING_ENABLED !== 'true') {
      return reply(res, 200, { received: true, provisioning: 'disabled' });
    }
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
      return reply(res, 200, { received: true, ignored: true });
    }
    if (!stripe) return reply(res, 503, { error: 'Stripe not configured' });
    return reply(res, 200, { received: true, ...await provision(event.data.object, stripe) });
  } catch (error) {
    console.error('PULSE webhook processing failed', event.id, error.type || error.name);
    return reply(res, 503, { error: 'Webhook processing failed' });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
