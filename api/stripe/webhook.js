import Stripe from 'stripe';
import { randomBytes, createHash } from 'node:crypto';

async function provision(session, stripe) {
  const url = process.env.PULSE_ONBOARDING_SUPABASE_URL;
  const key = process.env.PULSE_ONBOARDING_SUPABASE_SECRET_KEY;
  const tenant = process.env.PULSE_ONBOARDING_TENANT_ID;
  if (!url || !key || !tenant) throw new Error('Onboarding configuration incomplete');
  const full = await stripe.checkout.sessions.retrieve(session.id);
  if (full.mode !== 'subscription' || full.payment_status !== 'paid') return { skipped: true };
  const email = full.customer_details?.email || full.customer_email;
  if (!email || !full.customer || !full.subscription) throw new Error('Checkout missing customer information');
  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  const endpoint = base + '/rest/v1/pulse_onboarding_invites';
  const existing = await fetch(endpoint + '?select=id&stripe_checkout_session_id=eq.' + encodeURIComponent(full.id), { headers });
  if (!existing.ok) throw new Error('Database lookup failed: ' + existing.status);
  if ((await existing.json()).length) return { existing: true };
  const token = randomBytes(32).toString('hex');
  const insert = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      tenant_id: tenant,
      email,
      stripe_checkout_session_id: full.id,
      stripe_customer_id: full.customer,
      stripe_subscription_id: full.subscription,
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString()
    })
  });
  if (insert.status === 409) return { existing: true };
  if (!insert.ok) throw new Error('Database insert failed: ' + insert.status);
  // Invite delivery must be implemented before enabling provisioning.
  return { created: true, delivery_pending: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secretKey = process.env.PULSE_STRIPE_SECRET_KEY;
  const webhookSecret = process.env.PULSE_STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return res.status(503).json({ error: 'Webhook not configured' });
  const stripe = new Stripe(secretKey);
  let event;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    event = stripe.webhooks.constructEvent(Buffer.concat(chunks), req.headers['stripe-signature'], webhookSecret);
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }
  // Safe rollout: no customer records are written until delivery is configured.
  if (process.env.PULSE_ONBOARDING_PROVISIONING_ENABLED !== 'true') {
    return res.status(200).json({ received: true, provisioning: 'disabled' });
  }
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return res.status(200).json({ received: true, ignored: true });
  }
  try {
    const result = await provision(event.data.object, stripe);
    return res.status(200).json({ received: true, ...result });
  } catch (err) {
    console.error('Onboarding provisioning failed', event.id, err.message);
    return res.status(503).json({ error: 'Onboarding provisioning failed' });
  }
}
