const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const Stripe = require('stripe');
const handler = require('../api/stripe/webhook');

const attempt = '5edb34fd-9ac6-4b07-9f6d-3139b8d346ad';
const customerId = 'fcf15b12-14d2-4ad3-b8fb-9f6d3139b8d3';
const checkout = {
  id: 'cs_test_12345678901234567890',
  mode: 'subscription',
  client_reference_id: attempt,
  metadata: { pulse_flow: 'onboarding_v1', pulse_pending_id: attempt },
  customer: 'cus_test',
  subscription: 'sub_test',
  customer_details: { email: 'qa@example.com' },
  locale: 'en',
  payment_status: 'paid',
  currency: 'chf',
  amount_total: 9800
};

async function deliver({ type = 'checkout.session.completed', data = checkout, livemode = false, signed = true, signingSecret = process.env.PULSE_STRIPE_WEBHOOK_SECRET } = {}) {
  const payload = JSON.stringify({ id: 'evt_test', livemode, type, data: { object: data } });
  const req = Readable.from([payload]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': signed ? Stripe.webhooks.generateTestHeaderString({
    payload, secret: signingSecret
  }) : 'invalid' };
  const res = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(data) { this.body = data; return this; }
  };
  await handler(req, res);
  return res;
}

test('existing webhook validates signed sandbox events and only provisions a paid PULSE session', async t => {
  Object.assign(process.env, {
    PULSE_SECURE_ONBOARDING_ENABLED: 'true',
    PULSE_STRIPE_MODE: 'test',
    PULSE_STRIPE_SECRET_KEY: 'sk_test_fixture',
    PULSE_STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
    PULSE_STRIPE_PRICE_ID: 'price_fixture',
    PULSE_PUBLIC_ORIGIN: 'https://pulse.example.com',
    PULSE_B2C_TENANT_ID: attempt,
    PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com',
    PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_fixture',
    PULSE_NOTIFY_RESEND_API_KEY: 're_fixture', // Legacy config must never cause delivery.
    PULSE_NOTIFY_FROM: 'PULSE <test@example.com>',
    PULSE_NOTIFY_TO: 'qa-operator@example.com'
  });

  const rpc = [];
  const emails = [];
  const row = { customer_id: customerId, confirmed_at: null, notified_at: null };
  let databaseUnavailable = false;
  let failBuyerEmail = false;
  t.mock.method(Stripe.resources.Subscriptions.prototype, 'retrieve', async () => ({ status: 'active' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const data = JSON.parse(options.body);
    if (url.startsWith('https://api.resend.com/')) {
      emails.push({ data, key: options.headers['Idempotency-Key'] });
      if (failBuyerEmail && options.headers['Idempotency-Key'].startsWith('pulse-order-confirmation/')) {
        return Response.json({}, { status: 503 });
      }
      return Response.json({ id: 'mail_fixture' });
    }
    assert.equal(options.headers.apikey, 'sb_secret_fixture');
    assert.equal(options.headers.Authorization, undefined);
    if (url.endsWith('/rpc/pulse_finalize_checkout')) {
      if (databaseUnavailable) return Response.json({}, { status: 503 });
      rpc.push(data);
      return Response.json(data.p_terminal_status ? [] : [row]);
    }
    Object.assign(row, data);
    return Response.json([row]);
  });

  assert.equal((await deliver({ signed: false })).code, 400);
  assert.equal((await deliver({ livemode: true })).code, 400);
  assert.equal((await deliver({ data: { ...checkout, payment_status: 'unpaid' } })).code, 200);
  assert.equal((await deliver({ data: { ...checkout, metadata: {} } })).body.provisioning, 'disabled');
  assert.equal(rpc.length, 0);
  assert.equal(emails.length, 0);

  assert.equal((await deliver({ type: 'checkout.session.expired' })).code, 200);
  assert.equal((await deliver({ type: 'checkout.session.async_payment_failed' })).code, 200);
  assert.deepEqual(rpc.map(input => input.p_terminal_status), ['cancelled', 'payment_failed']);
  assert.equal(emails.length, 0);

  databaseUnavailable = true;
  t.mock.method(console, 'error', () => {});
  assert.equal((await deliver()).code, 503);
  databaseUnavailable = false;
  assert.equal((await deliver()).code, 200);
  assert.equal((await deliver({ type: 'checkout.session.async_payment_succeeded' })).code, 200);
  assert.equal(rpc.at(-1).p_subscription, checkout.subscription);
  assert.equal(emails.length, 0);
  assert.equal(row.confirmed_at, null);
  assert.equal(row.notified_at, null);

});

test('live webhook keeps the existing sandbox destination active and rejects crossed signatures', async () => {
  Object.assign(process.env, {
    PULSE_STRIPE_SECRET_KEY: 'sk_live_fixture',
    PULSE_STRIPE_WEBHOOK_SECRET: 'whsec_sandbox_fixture',
    PULSE_STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_live_fixture',
    PULSE_SECURE_ONBOARDING_ENABLED: 'true',
    PULSE_STRIPE_MODE: 'live'
  });
  try {
    assert.equal((await deliver()).body.ignored, true);
    assert.equal((await deliver({ livemode: true })).code, 400);
    assert.equal((await deliver({ signingSecret: 'whsec_live_fixture' })).code, 400);
    assert.equal((await deliver({
      livemode: true, signingSecret: 'whsec_live_fixture', data: { ...checkout, metadata: {} }
    })).body.provisioning, 'disabled');
  } finally {
    delete process.env.PULSE_STRIPE_LIVE_WEBHOOK_SECRET;
  }
});
