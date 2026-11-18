const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reconcilePaidSession } = require('../api/checkout-status');

const attempt = '5edb34fd-9ac6-4b07-9f6d-3139b8d346ad';
const checkout = {
  id: 'cs_test_12345678901234567890', livemode: false, mode: 'subscription',
  client_reference_id: attempt,
  metadata: { pulse_flow: 'onboarding_v1', pulse_pending_id: attempt },
  customer: 'cus_test', subscription: 'sub_test', payment_status: 'paid',
  currency: 'chf', amount_total: 9800
};

test('Stripe return reconciles a paid checkout once, while unpaid and wrong-mode sessions never create a customer', async t => {
  Object.assign(process.env, {
    PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com',
    PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_fixture'
  });
  delete process.env.PULSE_NOTIFY_RESEND_API_KEY;
  const sessions = [];
  const customers = new Map();
  const stripe = {
    checkout: { sessions: { retrieve: async id => { sessions.push(id); return checkout; } } },
    subscriptions: { retrieve: async () => ({ status: 'active' }) }
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/rpc/pulse_finalize_checkout'));
    const data = JSON.parse(options.body);
    if (!customers.has(data.p_session)) customers.set(data.p_session, { customer_id: '5f826fcb-e60a-4c17-a783-b6f7f74ed41a' });
    return Response.json([customers.get(data.p_session)]);
  });

  assert.equal(await reconcilePaidSession(checkout.id, 'test', stripe), true);
  assert.equal(await reconcilePaidSession(checkout.id, 'test', stripe), true);
  assert.equal(customers.size, 1);
  checkout.payment_status = 'unpaid';
  assert.equal(await reconcilePaidSession(checkout.id, 'test', stripe), false);
  checkout.payment_status = 'paid';
  assert.equal(await reconcilePaidSession(checkout.id, 'live', stripe), false);
  assert.equal(customers.size, 1);
  assert.equal(sessions.length, 4);
});
