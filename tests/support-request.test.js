const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/support-request');
const id = '5edb34fd-9ac6-4b07-9f6d-3139b8d346ad';
function res() { return { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } }; }
const input = { requestId: id, email: 'qa@example.com', type: 'cancellation', message: 'Hiermit kündige ich meine Mitgliedschaft.', name: 'QA Test', contract: 'PULSE Personal', cancellationKind: 'ordinary', end: 'next_possible' };
test('support records cancellation and withdrawal with persistent receipt, retries do not create duplicate tickets', async t => {
  Object.assign(process.env, { PULSE_PUBLIC_ORIGIN: 'https://pulse.example.com', PULSE_HEALTH_DATA_KEY: 'fixture', PULSE_ONBOARDING_SUPABASE_URL: 'https://db.example.com', PULSE_ONBOARDING_SUPABASE_SECRET_KEY: 'sb_secret_fixture' });
  let rows = [], allowed = true;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(!url.includes('resend'));
    if (url.endsWith('/rpc/pulse_allow_checkout')) return Response.json(allowed);
    if (options.method === 'POST') {
      const row = { ...JSON.parse(options.body), created_at: '2026-11-21T18:00:00.000Z' }; rows.push(row); return Response.json([row]);
    }
    return Response.json(url.includes('&id=eq.') ? rows.filter(row => url.includes(row.id)) : rows);
  });
  async function send(body, origin = 'https://pulse.example.com') {
    const r = res(); await handler({ method: 'POST', headers: { origin, 'content-type': 'application/json' }, body }, r); return r;
  }
  let r = await send(input); assert.equal(r.code, 201); assert.equal(r.body.receipt.receivedAt, '2026-11-21T18:00:00.000Z');
  assert.match(r.body.receipt.message, /Gewünschtes Ende: Zum nächstmöglichen Zeitpunkt/);
  r = await send(input); assert.equal(r.code, 200); assert.equal(rows.length, 1);
  assert.equal((await send({ ...input, message: 'Different declaration, same reference.' })).code, 409);
  assert.equal((await send({ ...input, name: '' })).code, 400);
  assert.equal((await send({ ...input, cancellationKind: 'extraordinary', reason: '' })).code, 400);
  assert.equal((await send({ ...input, end: 'date', endDate: '2026-02-31' })).code, 400);
  assert.equal((await send(input, 'https://evil.example')).code, 403);
  rows = []; r = await send({ ...input, type: 'withdrawal' }); assert.equal(r.code, 201); assert.match(r.body.receipt.message, /WIDERRUF/);
  rows = []; r = await send({ ...input, type: 'deletion' }); assert.equal(r.code, 201); assert.match(r.body.receipt.message, /DATENLÖSCHUNG/);
  assert.equal(rows[0].request_type, 'other'); // Preserve the existing dashboard's supported ticket types.
  allowed = false; assert.equal((await send(input)).code, 429);
});
