const { createHash } = require('node:crypto');
const { db, env } = require('./onboarding-server');
const RISK_EVENTS = ['charge.refunded', 'charge.dispute.created', 'radar.early_fraud_warning.created'];
const objectId = value => typeof value === 'string' ? value : value?.id;
async function ticket(event, customer, detail) {
  if (!event.id || !customer.email) return;
  const bytes = createHash('sha256').update(`pulse-billing:${event.id}:${customer.id}`).digest();
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex').slice(0, 32), id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  try {
    await db('pulse_support_requests', '', 'POST', { id, email: customer.email, request_type: 'billing', status: 'open', source: 'stripe',
      message: `Stripe: ${event.type}\nEreignis: ${event.id}\nPULSE-Referenz: ${customer.id}\n${detail}\nBitte prüfen und über den bestehenden Supportweg bearbeiten. Keine automatische Erstattung, Kündigung oder Kundenfreischaltung.` });
  } catch (error) { if (error.message !== 'Database operation failed: 409') throw error; }
}
async function findSubscription(id, mode) {
  if (!id?.startsWith('sub_')) return null;
  const [row] = await db('pulse_coaching_customers', `select=id,email&tenant_id=eq.${env('PULSE_B2C_TENANT_ID')}&stripe_checkout_session_id=like.cs_${mode}_*&stripe_subscription_id=eq.${encodeURIComponent(id)}&limit=1`);
  return row;
}
async function riskAlert(event, mode, stripe) {
  const data = event.data.object;
  let charge = event.type === 'charge.refunded' ? data : null;
  let paymentIntent = objectId(data.payment_intent);
  if (!paymentIntent && !charge && objectId(data.charge)) charge = await stripe.charges.retrieve(objectId(data.charge));
  paymentIntent ||= objectId(charge?.payment_intent);
  const invoices = new Set();
  if (charge?.invoice) invoices.add(objectId(charge.invoice));
  if (paymentIntent) {
    // Modern API: a PaymentIntent can pay more than one invoice. Iterate every page.
    for await (const payment of stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: paymentIntent }, status: 'paid', limit: 100 }))
      if (payment.invoice) invoices.add(objectId(payment.invoice));
  }
  for (const invoiceId of invoices) {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (invoice.livemode !== (mode === 'live')) throw new Error('Invoice mode mismatch');
    const subscription = objectId(invoice.parent?.subscription_details?.subscription || invoice.subscription);
    const customer = await findSubscription(subscription, mode);
    if (customer) await ticket(event, customer, `Rechnung: ${invoiceId}\nAbo: ${subscription}`);
  }
}
async function customerAlert(event, mode) {
  const customer = event.data.object;
  if (typeof customer.id !== 'string' || !customer.id.startsWith('cus_') || !customer.email) return;
  const rows = await db('pulse_coaching_customers', `select=id,email&tenant_id=eq.${env('PULSE_B2C_TENANT_ID')}&stripe_checkout_session_id=like.cs_${mode}_*&stripe_customer_id=eq.${encodeURIComponent(customer.id)}`);
  for (const row of rows) if (row.email.toLowerCase() !== customer.email.toLowerCase())
    await ticket(event, row, 'Die Rechnungs-E-Mail in Stripe wurde geändert. Kontaktzuordnung vor Änderung des Coaching-Kontos prüfen.');
}
module.exports = { RISK_EVENTS, riskAlert, customerAlert, ticket, findSubscription };
