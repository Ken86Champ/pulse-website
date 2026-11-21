const { test } = require('node:test');
const assert = require('node:assert/strict');
const { documentFor } = require('../api/order-confirmation');
test('contract receipt includes immutable terms and withdrawal text, escapes personal values and rejects unknown historical policies', () => {
  const row = { consent_version: 'pulse-privacy-terms-2026-11-21-dach-v2', created_at: '2026-11-21T18:00:00Z', email: '<script>bad</script>@example.com' };
  const html = documentFor({ id: 'cs_test_fixture' }, row);
  assert.ok(html.includes('CHF 98 pro Monat'));
  assert.ok(html.includes('Widerrufsbelehrung'));
  assert.ok(html.includes('Muster-Widerrufsformular'));
  assert.ok(html.includes('2026-11-21T18:00:00.000Z'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(documentFor({}, { ...row, consent_version: '../../secret' }), null);
  assert.equal(documentFor({}, { ...row, consent_version: 'pulse-privacy-v1' }), null);
});
