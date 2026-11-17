const { db, env, UUID } = require('./onboarding-server');

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const TERMINAL_EVENTS = {
  'checkout.session.expired': 'cancelled',
  'checkout.session.async_payment_failed': 'payment_failed'
};

const CONFIRMATION = {
  de: ['Deine PULSE-Mitgliedschaft ist bestätigt', 'Wir haben deine Zahlung über CHF 98 erhalten. Deine PULSE-Mitgliedschaft kostet CHF 98 pro Monat. Wir richten dein Coaching persönlich ein und melden uns für die nächsten Schritte.'],
  en: ['Your PULSE membership is confirmed', 'We received your CHF 98 payment. Your PULSE membership costs CHF 98 per month. We’ll personally set up your coaching and contact you about the next steps.'],
  fr: ['Ton abonnement PULSE est confirmé', 'Nous avons reçu ton paiement de 98 CHF. Ton abonnement PULSE coûte 98 CHF par mois. Nous allons configurer ton coaching et te contacter pour la suite.'],
  it: ['Il tuo abbonamento PULSE è confermato', 'Abbiamo ricevuto il tuo pagamento di CHF 98. L’abbonamento PULSE costa CHF 98 al mese. Configureremo il tuo coaching e ti contatteremo per i prossimi passi.'],
  es: ['Tu suscripción PULSE está confirmada', 'Hemos recibido tu pago de 98 CHF. Tu suscripción PULSE cuesta 98 CHF al mes. Configuraremos tu coaching y te contactaremos para los próximos pasos.']
};

async function sendEmail(key, to, subject, text, idempotencyKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: env('PULSE_NOTIFY_FROM'), to: [to], subject, text }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`PULSE notification failed: ${response.status}`);
}

async function deliverEmails(customer, checkout, mode) {
  const configuredKey = process.env.PULSE_NOTIFY_RESEND_API_KEY;
  if (!configuredKey && mode === 'test') return;
  const key = configuredKey || env('PULSE_NOTIFY_RESEND_API_KEY');
  const customerId = customer.customer_id;
  const operator = env('PULSE_NOTIFY_TO');

  const tasks = [];
  if (!customer.confirmed_at) tasks.push(sendOrderConfirmation(key, customerId, checkout, mode, operator));
  if (!customer.notified_at) tasks.push(sendSetupNotification(key, customerId, mode, operator));
  const deliveries = await Promise.allSettled(tasks);
  const failure = deliveries.find(delivery => delivery.status === 'rejected');
  if (failure) throw failure.reason;
}

async function sendOrderConfirmation(key, customerId, checkout, mode, operator) {
  const checkoutEmail = checkout.customer_details?.email || checkout.customer_email;
  if (mode === 'live' && !checkoutEmail) throw new Error('Missing checkout confirmation email');
  const locale = Object.hasOwn(CONFIRMATION, checkout.locale) ? checkout.locale : 'de';
  const [subject, text] = CONFIRMATION[locale];
  await sendEmail(key, mode === 'test' ? operator : checkoutEmail, mode === 'test' ? `[Test] ${subject}` : subject,
    text, `pulse-order-confirmation/${customerId}`);
  await db('pulse_coaching_customers', `id=eq.${customerId}&confirmed_at=is.null`, 'PATCH',
    { confirmed_at: new Date().toISOString() });
}

async function sendSetupNotification(key, customerId, mode, operator) {
  await sendEmail(key, operator, mode === 'test' ? '[Test] Neues PULSE-Coaching' : 'Neues PULSE-Coaching',
    `Die Zahlung ist bestätigt. Das Coaching kann eingerichtet werden.\n\nKunden-ID: ${customerId}`,
    `pulse-coaching-setup/${customerId}`);
  await db('pulse_coaching_customers', `id=eq.${customerId}&notified_at=is.null`, 'PATCH',
    { notified_at: new Date().toISOString() });
}

async function fulfill(event, mode, stripe) {
  const data = event.data.object;
  if (event.type === 'customer.subscription.deleted') {
    await db('pulse_coaching_customers',
      `stripe_subscription_id=eq.${encodeURIComponent(data.id)}&stripe_checkout_session_id=like.cs_${mode}_*`,
      'PATCH', { status: 'subscription_cancelled' });
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
  await deliverEmails(customer, data, mode);
}

module.exports = { fulfill };
