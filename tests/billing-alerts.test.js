const { test } = require('node:test');
const assert = require('node:assert/strict');
const { riskAlert } = require('../lib/billing-alerts');
test('risk events resolve every invoice payment and create only idempotent, tenant-scoped PULSE alerts', async t => {
  Object.assign(process.env, { PULSE_B2C_TENANT_ID: '5edb34fd-9ac6-4b07-9f6d-3139b8d346ad', PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com', PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_fixture' });
  const tickets = new Map(), lookedUp = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'GET') { assert.ok(url.includes('tenant_id=eq.') && url.includes('like.cs_test_')); return Response.json(url.includes('sub_pulse') ? [{ id: 'customer-fixture', email: 'qa@example.com' }] : []); }
    const row = JSON.parse(options.body);
    if (tickets.has(row.id)) return Response.json({}, { status: 409 });
    tickets.set(row.id, row); return Response.json([row]);
  });
  const stripe = { invoicePayments: { list: params => { assert.equal(params.payment.payment_intent, 'pi_fixture'); return (async function* () { yield { invoice: 'in_pulse' }; yield { invoice: 'in_other' }; })(); } },
    invoices: { retrieve: async id => { lookedUp.push(id); return { livemode: false, parent: { subscription_details: { subscription: id === 'in_pulse' ? 'sub_pulse' : 'sub_other' } } }; } } };
  const event = { id: 'evt_fixture', type: 'charge.refunded', data: { object: { payment_intent: 'pi_fixture' } } };
  await riskAlert(event, 'test', stripe); await riskAlert(event, 'test', stripe);
  assert.equal(tickets.size, 1); assert.equal(lookedUp.length, 4);
  assert.ok([...tickets.values()][0].message.includes('Keine automatische Erstattung'));
});
