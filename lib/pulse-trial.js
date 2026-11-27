'use strict';
const { createHmac, hkdfSync, timingSafeEqual } = require('node:crypto');
const { db, checkoutConfig, UUID } = require('./onboarding-server');
const FLOW = 'pulse_trial_v1';
const CONSENT = 'pulse-trial-2026-11-27-v1';

function trialConfig() {
  if (process.env.PULSE_B2C_TRIAL_ENABLED !== 'true' || process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') throw new Error('Gratis-Test noch nicht freigeschaltet');
  return checkoutConfig();
}
function signature(body, timestamp, key) {
  const derived = hkdfSync('sha256', Buffer.from(key, 'base64'), Buffer.alloc(0), 'pulse-trial-ready-v1', 32);
  return createHmac('sha256', Buffer.from(derived)).update(`${timestamp}.${body}`).digest('hex');
}
function verifySignature(body, timestamp, value, key, now = Date.now()) {
  if (!/^\d{10}$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300 || !/^[a-f0-9]{64}$/.test(value || '')) return false;
  return timingSafeEqual(Buffer.from(signature(body, timestamp, key)), Buffer.from(value));
}
function validPrice(price, mode) {
  return price.active === true && price.livemode === (mode === 'live') && price.currency === 'chf'
    && price.unit_amount === 9800 && price.recurring?.interval === 'month'
    && price.recurring.interval_count === 1 && price.recurring.usage_type === 'licensed';
}
async function registerSession(session, mode, stripe) {
  if (session.metadata?.pulse_flow !== FLOW) return false;
  if (session.livemode !== (mode === 'live') || !session.id.startsWith(`cs_${mode}_`)
    || session.mode !== 'setup' || session.metadata.pulse_pending_id !== session.client_reference_id
    || !UUID.test(session.client_reference_id || '')) throw new Error('Ungültige Testzuordnung');
  if (session.status !== 'complete') return false;
  const intent = await stripe.setupIntents.retrieve(session.setup_intent);
  if (intent.status !== 'succeeded' || intent.livemode !== (mode === 'live')
    || intent.customer !== session.customer || typeof intent.payment_method !== 'string'
    || typeof session.customer !== 'string') throw new Error('Zahlungsmethode nicht bestätigt');
  const payment = await stripe.paymentMethods.retrieve(intent.payment_method);
  if (payment.customer !== session.customer || payment.livemode !== (mode === 'live')) throw new Error('Fremde Zahlungsmethode');
  await db('rpc/pulse_register_trial', '', 'POST', {
    p_id: session.client_reference_id, p_session: session.id,
    p_customer: session.customer, p_payment_method: intent.payment_method
  });
  return true;
}
async function startTrial(id, appCustomer, stripe, settings) {
  const [trial] = await db('rpc/pulse_claim_trial', '', 'POST', { p_id: id, p_tenant: settings.tenant, p_app_customer: appCustomer });
  if (!trial) return { status: 'waiting' };
  if (trial.stripe_subscription_id) return { status: trial.status, trialEnd: trial.trial_end };
  const [price, method] = await Promise.all([stripe.prices.retrieve(trial.price_id), stripe.paymentMethods.retrieve(trial.stripe_payment_method_id)]);
  if (!validPrice(price, settings.mode) || trial.mode !== settings.mode || method.customer !== trial.stripe_customer_id
    || method.livemode !== (settings.mode === 'live')) throw new Error('Testabo nicht korrekt konfiguriert');
  const end = Math.floor(Date.parse(trial.trial_end) / 1000);
  if (!Number.isSafeInteger(end) || end <= Date.now() / 1000 + 60) throw new Error('Testzeitraum abgelaufen; keine Abbuchung');
  const subscription = await stripe.subscriptions.create({
    customer: trial.stripe_customer_id, items: [{ price: trial.price_id }],
    default_payment_method: trial.stripe_payment_method_id,
    trial_end: end, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    metadata: { pulse_flow: FLOW, pulse_pending_id: trial.id },
    payment_settings: { save_default_payment_method: 'on_subscription' }
  }, { idempotencyKey: `pulse_trial_subscription_${trial.id}` });
  if (subscription.status !== 'trialing' || subscription.customer !== trial.stripe_customer_id
    || subscription.livemode !== (settings.mode === 'live') || subscription.trial_end !== end) throw new Error('Testabo nicht bestätigt');
  const cancelled = await db('rpc/pulse_finish_trial', '', 'POST', { p_id: trial.id, p_subscription: subscription.id, p_end: trial.trial_end });
  if (cancelled) {
    await stripe.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false });
    return { status: 'cancelled' };
  }
  return { status: 'trialing', trialEnd: trial.trial_end };
}
async function cancelTrial(trial, stripe) {
  if (trial.stripe_subscription_id) {
    const current = await stripe.subscriptions.retrieve(trial.stripe_subscription_id);
    if (current.status !== 'trialing' && current.status !== 'canceled') return { status: 'use_portal' };
  }
  await db('rpc/pulse_cancel_trial', '', 'POST', { p_id: trial.id, p_session: trial.stripe_checkout_session_id });
  // Ein Create kann gleichzeitig laufen. Der subscription.created-Webhook prüft ebenfalls cancel_requested.
  const subscriptions = await stripe.subscriptions.list({ customer: trial.stripe_customer_id, status: 'all', limit: 100 });
  for (const sub of subscriptions.data) {
    if (sub.metadata?.pulse_pending_id === trial.id && sub.status !== 'canceled') {
      if (sub.status !== 'trialing') throw new Error('Abrechnung bereits begonnen; Kundenportal nutzen');
      await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
    }
  }
  return { status: 'cancelled' };
}
async function syncTrialSubscription(subscriptionId, mode, stripe) {
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  if (current.metadata?.pulse_flow !== FLOW) return;
  const [trial] = await db('pulse_trials', `select=*&stripe_customer_id=eq.${encodeURIComponent(current.customer)}&mode=eq.${mode}&limit=1`);
  if (!trial || current.livemode !== (mode === 'live') || current.metadata.pulse_pending_id !== trial.id) throw new Error('Testabo-Zuordnung fehlt');
  if (trial.cancel_requested && current.status !== 'canceled') {
    await stripe.subscriptions.cancel(current.id, { invoice_now: false, prorate: false });
    throw new Error('Kündigung wird abgeglichen');
  }
  const ended = ['canceled', 'incomplete_expired'].includes(current.status);
  const update = { stripe_subscription_id: current.id };
  if (ended) update.status = 'cancelled';
  else if (current.status === 'active') update.status = 'active';
  // Der Create-Webhook darf eine noch laufende Kündigung nicht zurücksetzen.
  await db('pulse_trials', `id=eq.${trial.id}`, 'PATCH', update);
  await db('pulse_coaching_customers', `id=eq.${trial.customer_id}`, 'PATCH', {
    stripe_subscription_id: current.id, stripe_subscription_status: current.status,
    stripe_cancel_at_period_end: !ended && (current.cancel_at_period_end === true || typeof current.cancel_at === 'number'),
    stripe_cancel_at: !ended && (current.cancel_at || current.cancel_at_period_end && (current.current_period_end || current.items?.data?.[0]?.current_period_end))
      ? new Date((current.cancel_at || current.current_period_end || current.items?.data?.[0]?.current_period_end) * 1000).toISOString() : null,
    ...(ended ? { status: 'subscription_cancelled' } : {})
  });
}
module.exports = { FLOW, CONSENT, trialConfig, signature, verifySignature, validPrice, registerSession, startTrial, cancelTrial, syncTrialSubscription };
