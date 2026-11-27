const { db, env, UUID } = require('./onboarding-server');
const { RISK_EVENTS, riskAlert, customerAlert, ticket, findSubscription } = require('./billing-alerts');

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const TERMINAL_EVENTS = {
  'checkout.session.expired': 'cancelled',
  'checkout.session.async_payment_failed': 'payment_failed'
};

const LIFECYCLE_EVENTS = ['customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'];

async function syncSubscription(id, mode, stripe) {
  if (typeof id !== 'string' || !id.startsWith('sub_')) return;
  const tenant = env('PULSE_B2C_TENANT_ID');
  const filter = `stripe_subscription_id=eq.${encodeURIComponent(id)}&tenant_id=eq.${tenant}&stripe_checkout_session_id=like.cs_${mode}_*`;
  const [existing] = await db('pulse_coaching_customers', `select=id,status&${filter}&limit=1`);
  if (!existing) return;
  // Read Stripe's current state: a delayed retry must never undo a newer cancellation or payment.
  const current = await stripe.subscriptions.retrieve(id);
  if (current.livemode !== (mode === 'live') || current.id !== id) throw new Error('Subscription mode mismatch');
  const ended = ['canceled', 'incomplete_expired'].includes(current.status);
  const scheduled = !ended && (current.cancel_at_period_end === true || typeof current.cancel_at === 'number');
  const epoch = scheduled ? (current.cancel_at || current.current_period_end || current.items?.data?.[0]?.current_period_end) : null;
  const update = {
    stripe_subscription_status: current.status,
    stripe_cancel_at_period_end: scheduled,
    stripe_cancel_at: Number.isSafeInteger(epoch) && epoch > 0 ? new Date(epoch * 1000).toISOString() : null
  };
  if (ended) update.status = 'subscription_cancelled';
  // A failed payment never marks an unreviewed coaching profile as approved/active.
  await db('pulse_coaching_customers', `id=eq.${existing.id}&tenant_id=eq.${tenant}`, 'PATCH', update);
}

async function fulfill(event, mode, stripe) {
  const data = event.data.object;
  if (RISK_EVENTS.includes(event.type)) return riskAlert(event, mode, stripe);
  if (event.type === 'customer.updated') return customerAlert(event, mode);
  if (LIFECYCLE_EVENTS.includes(event.type)) {
    const subscription = event.type.startsWith('customer.subscription.') ? data.id :
      (data.parent?.subscription_details?.subscription || data.subscription);
    const id = typeof subscription === 'object' ? subscription?.id : subscription;
    // Rechnet auch das Ende eines Gratis-Tests ab, falls ein Rechnungsereignis zuerst ankommt.
    if (id && process.env.PULSE_B2C_TRIAL_ENABLED === 'true') await require('./pulse-trial').syncTrialSubscription(id, mode, stripe);
    await syncSubscription(id, mode, stripe);
    if (['invoice.payment_failed', 'invoice.payment_action_required'].includes(event.type)) {
      const customer = await findSubscription(id, mode);
      if (customer) await ticket(event, customer, `Rechnung: ${data.id}\nZahlung prüfen; über den bestehenden Coaching-Kanal kontaktieren und auf das Stripe-Kundenportal verweisen.`);
    }
    return;
  }
  const terminal = TERMINAL_EVENTS[event.type];
  if (!terminal && !PAID_EVENTS.includes(event.type)) return;
  if (data.metadata?.pulse_flow !== 'onboarding_v1') return;
  const id = data.client_reference_id;
  if (typeof id !== 'string' || !UUID.test(id) || data.metadata.pulse_pending_id !== id
    || !data.id.startsWith(`cs_${mode}_`) || data.mode !== 'subscription') {
    throw new Error('Invalid Stripe checkout association');
  }
  const input = {
    p_id: id, p_session: data.id, p_customer: null, p_subscription: null, p_terminal_status: terminal ?? null
  };
  if (terminal) {
    await db('rpc/pulse_finalize_checkout', '', 'POST', input);
    return;
  }
  if (data.payment_status !== 'paid') return;
  if (data.currency !== 'chf' || data.amount_total !== 9800
    || typeof data.customer !== 'string' || typeof data.subscription !== 'string') {
    throw new Error('Unexpected paid checkout');
  }
  const [customer] = await db('rpc/pulse_finalize_checkout', '', 'POST', {
    ...input, p_customer: data.customer, p_subscription: data.subscription
  });
  if (!customer) throw new Error('Missing checkout customer');

  // Events can arrive out of order. Recheck the current subscription after the insert.
  const subscription = await stripe.subscriptions.retrieve(data.subscription);
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    await db('pulse_coaching_customers', `id=eq.${customer.customer_id}`, 'PATCH', { status: 'subscription_cancelled' });
  }
  // Order receipts are delivered on the verified return page; no external mail provider.
}

module.exports = { fulfill, syncSubscription, LIFECYCLE_EVENTS, RISK_EVENTS };
