'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const checkout = require('../api/secure-checkout');

function response() {
  return { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return body; } };
}
test('trial availability remains separate from the enabled immediately paid checkout', async () => {
  const res = response();
  await checkout({ method: 'GET', query: { flow: 'trial' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { available: false });
});
test('a trial request cannot create a paid checkout even with production checkout enabled', async () => {
  const res = response();
  await checkout({ method: 'POST', body: { flow: 'trial' } }, res);
  assert.equal(res.code, 503);
  assert.match(res.body.error, /Test/);
});
test('unknown commercial flow is rejected rather than interpreted as a paid membership', async () => {
  const res = response();
  await checkout({ method: 'POST', body: { flow: 'unknown' } }, res);
  assert.equal(res.code, 400);
});
