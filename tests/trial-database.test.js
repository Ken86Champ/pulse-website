'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

test('Postgres: Teststart, Doppelklick, Kündigungsrennen und alte Käufe bleiben konsistent', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec(readFileSync('sql/pulse-secure-checkout.sql', 'utf8'));
    await db.exec(readFileSync('sql/pulse-checkout-atomic.sql', 'utf8'));
    await db.exec('alter table pulse_coaching_customers add column stripe_subscription_status text;');
    const migration = readFileSync('supabase/migrations/20261127133559_pulse_b2c_trial.sql', 'utf8');
    await db.exec(migration);await db.exec(migration);
    const id = '550e8400-e29b-41d4-a716-446655440000', tenant = '550e8400-e29b-41d4-a716-446655440001', app = '550e8400-e29b-41d4-a716-446655440002';
    await db.query(`insert into pulse_trials(id,tenant_id,email,stripe_checkout_session_id,mode,price_id,locale,consent_version,encrypted_answers) values($1,$2,'synthetic@example.invalid','cs_test_trial','test','price_test','de','trial-v1','{}')`, [id, tenant]);
    const register = () => db.query('select pulse_register_trial($1,$2,$3,$4) as id', [id, 'cs_test_trial', 'cus_test', 'pm_test']);
    const first = await register(), second = await register();assert.equal(first.rows[0].id, second.rows[0].id);
    assert.equal((await db.query('select count(*)::int as n from pulse_coaching_customers')).rows[0].n, 1);
    assert.equal((await db.query('select ready_at from pulse_trials')).rows[0].ready_at, null);
    const claim = () => db.query('select * from pulse_claim_trial($1,$2,$3)', [id, tenant, app]);
    const ready = (await claim()).rows[0];assert.equal(Date.parse(ready.trial_end) - Date.parse(ready.ready_at), 604800000);
    assert.equal((await claim()).rows.length, 0);
    await db.query('select * from pulse_cancel_trial($1,$2)', [id, 'cs_test_trial']);
    assert.equal((await db.query('select pulse_finish_trial($1,$2,$3) as cancelled', [id, 'sub_test', ready.trial_end])).rows[0].cancelled, true);
    assert.equal((await claim()).rows.length, 0);
    assert.equal((await db.query('select status from pulse_coaching_customers')).rows[0].status, 'subscription_cancelled');
    const privileges = await db.query("select has_table_privilege('anon','pulse_trials','SELECT') as anon,has_function_privilege('authenticated','pulse_claim_trial(uuid,uuid,uuid)','EXECUTE') as member");
    assert.deepEqual(privileges.rows[0], { anon: false, member: false });
  } finally { await db.close(); }
});
