'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { signature, verifySignature, registerSession, startTrial, FLOW } = require('../lib/pulse-trial');
const attempt = '550e8400-e29b-41d4-a716-446655440000';
const appCustomer = '550e8400-e29b-41d4-a716-446655440001';
const price = { active: true, livemode: false, currency: 'chf', unit_amount: 9800, recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } };
function database(t, run) {
  Object.assign(process.env, { PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com', PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_synthetic' });
  t.mock.method(globalThis, 'fetch', async (url, options) => Response.json(await run(new URL(url).pathname.split('/').pop(), JSON.parse(options.body || '{}'))));
}
test('Bereitmeldung: manipulierte, alte und zukünftige Signaturen starten kein Testabo', () => {
  const key = randomBytes(32).toString('base64'), body = JSON.stringify({ trialId: attempt, appCustomerId: appCustomer }), now = 1800000000000, stamp = String(now / 1000);
  const signed = signature(body, stamp, key);
  assert.equal(verifySignature(body, stamp, signed, key, now), true);
  assert.equal(verifySignature(body + ' ', stamp, signed, key, now), false);
  assert.equal(verifySignature(body, stamp, signed, key, now + 301000), false);
  assert.equal(verifySignature(body, stamp, signed, key, now - 301000), false);
  assert.equal(verifySignature(body, stamp, 'not-a-signature', key, now), false);
});
test('Kartenhinterlegung übernimmt einmalig, ohne Abo-Erstellung oder Abbuchung', async t => {
  let registrations = 0;
  database(t, (path, input) => { assert.equal(path, 'pulse_register_trial'); assert.equal(input.p_id, attempt); registrations++; return attempt; });
  const session = { id: 'cs_test_12345678901234567890', mode: 'setup', status: 'complete', livemode: false, setup_intent: 'seti_test', customer: 'cus_test', client_reference_id: attempt, metadata: { pulse_flow: FLOW, pulse_pending_id: attempt } };
  const stripe = { setupIntents: { retrieve: async () => ({ status: 'succeeded', livemode: false, customer: 'cus_test', payment_method: 'pm_test' }) }, paymentMethods: { retrieve: async () => ({ customer: 'cus_test', livemode: false }) } };
  assert.equal(await registerSession(session, 'test', stripe), true);
  assert.equal(await registerSession({ ...session, status: 'open' }, 'test', stripe), false);
  await assert.rejects(registerSession(session, 'live', stripe), /Testzuordnung/);
  stripe.paymentMethods.retrieve = async () => ({ customer: 'cus_other', livemode: false });
  await assert.rejects(registerSession(session, 'test', stripe), /Fremde/);
  assert.equal(registrations, 1);
});
test('Bereitstellung erzeugt exakt ein sieben Tage kostenfreies Abo; Kündigungsrennen beendet es', async t => {
  const trialEnd = new Date(Math.floor(Date.now() / 1000) * 1000 + 7 * 86400000).toISOString();
  let claims = 0, creates = 0, cancelled = 0, cancellationRequested = false;
  const trial = { id: attempt, price_id: 'price_test', mode: 'test', stripe_customer_id: 'cus_test', stripe_payment_method_id: 'pm_test', trial_end: trialEnd };
  database(t, (path, input) => {
    if (path === 'pulse_claim_trial') { claims++; assert.equal(input.p_app_customer, appCustomer); return [trial]; }
    assert.equal(path, 'pulse_finish_trial');assert.equal(input.p_end, trialEnd);return cancellationRequested;
  });
  const stripe = { prices: { retrieve: async () => price }, paymentMethods: { retrieve: async () => ({ customer: 'cus_test', livemode: false }) }, subscriptions: {
    create: async (input, options) => { creates++;assert.equal(options.idempotencyKey, 'pulse_trial_subscription_' + attempt);assert.equal(input.trial_end, Date.parse(trialEnd) / 1000);assert.equal(input.items[0].price, 'price_test');assert.equal(input.trial_settings.end_behavior.missing_payment_method, 'cancel');assert.equal(input.add_invoice_items, undefined);return { id: 'sub_test', customer: 'cus_test', status: 'trialing', livemode: false, trial_end: input.trial_end }; },
    cancel: async (id, input) => { assert.equal(id, 'sub_test');assert.deepEqual(input, { invoice_now: false, prorate: false });cancelled++; }
  } };
  assert.equal((await startTrial(attempt, appCustomer, stripe, { tenant: attempt, mode: 'test' })).status, 'trialing');
  cancellationRequested = true;
  assert.equal((await startTrial(attempt, appCustomer, stripe, { tenant: attempt, mode: 'test' })).status, 'cancelled');
  assert.equal(cancelled, 1);assert.equal(claims, 2);assert.equal(creates, 2); // Derselbe Stripe-Idempotenzschlüssel, nie zwei verschiedene Abos.
  trial.stripe_subscription_id = 'sub_test';trial.status = 'trialing';
  await startTrial(attempt, appCustomer, stripe, { tenant: attempt, mode: 'test' });assert.equal(creates, 2);
});
test('Wartende Freischaltung oder falscher Preis erzeugt kein Abo', async t => {
  database(t, () => []);
  assert.deepEqual(await startTrial(attempt, appCustomer, {}, { tenant: attempt, mode: 'test' }), { status: 'waiting' });
});
