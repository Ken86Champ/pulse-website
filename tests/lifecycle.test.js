const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fulfill } = require('../lib/pulse-fulfillment');
const tenant = '5edb34fd-9ac6-4b07-9f6d-3139b8d346ad';
test('renewals, payment failures and cancellation sync the current Stripe state within tenant and mode', async t => {
  Object.assign(process.env, { PULSE_B2C_TENANT_ID: tenant, PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com', PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_fixture' });
  let current = { id: 'sub_fixture', livemode: false, status: 'active', cancel_at_period_end: true, items: { data: [{ current_period_end: 1800000000 }] } };
  let known = true, queries = [], updates = [];
  const stripe = { subscriptions: { retrieve: async id => { assert.equal(id, 'sub_fixture'); return current; } } };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'GET') { queries.push(url); return Response.json(known ? [{ id: tenant, status: 'coaching_setup_required' }] : []); }
    updates.push(JSON.parse(options.body)); return Response.json([]);
  });
  const invoice = { id: 'in_fixture', parent: { subscription_details: { subscription: 'sub_fixture' } } };
  await fulfill({ type: 'customer.subscription.updated', data: { object: { id: 'sub_fixture' } } }, 'test', stripe);
  assert.equal(updates.at(-1).stripe_cancel_at_period_end, true);
  assert.equal(updates.at(-1).stripe_cancel_at, new Date(1800000000 * 1000).toISOString());
  assert.equal(updates.at(-1).status, undefined);
  assert.ok(queries.every(url => url.includes('tenant_id=eq.' + tenant) && url.includes('like.cs_test_')));
  current = { ...current, status: 'past_due', cancel_at_period_end: false };
  await fulfill({ type: 'invoice.payment_failed', data: { object: invoice } }, 'test', stripe);
  assert.equal(updates.at(-1).stripe_subscription_status, 'past_due');
  assert.equal(updates.at(-1).status, undefined);
  current = { ...current, status: 'active' };
  await fulfill({ type: 'invoice.paid', data: { object: { subscription: 'sub_fixture' } } }, 'test', stripe);
  assert.equal(updates.at(-1).stripe_subscription_status, 'active');
  current = { ...current, status: 'canceled' };
  await fulfill({ type: 'customer.subscription.updated', data: { object: { id: 'sub_fixture', status: 'active' } } }, 'test', stripe);
  assert.equal(updates.at(-1).status, 'subscription_cancelled');
  const count = updates.length; known = false;
  await fulfill({ type: 'invoice.paid', data: { object: invoice } }, 'test', stripe);
  assert.equal(updates.length, count);
  known = true; current.livemode = true;
  await assert.rejects(() => fulfill({ type: 'invoice.paid', data: { object: invoice } }, 'test', stripe), /mode mismatch/);
});
