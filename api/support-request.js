const { createHmac, randomUUID } = require('node:crypto');
const { db, reply, UUID, env } = require('../lib/onboarding-server');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = new Set(['cancellation', 'withdrawal', 'deletion', 'billing', 'other']);

function clean(value, max = 200) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
}
function receipt(row, type) {
  return { id: row.id, receivedAt: row.created_at, email: row.email, type, message: row.message,
    provider: '10X Group GmbH · Ulmenstrasse 11 · 9000 St. Gallen · Schweiz',
    note: type === 'cancellation'
      ? 'Deine Kündigungserklärung ist eingegangen. Massgebend ist dieser Eingangszeitpunkt. Das tatsächliche Vertragsende wird nach Zuordnung des Vertrags gesondert bestätigt.'
      : 'Deine Erklärung ist eingegangen. Die Bearbeitung und gegebenenfalls Identitätsprüfung erfolgt durch den Support.' };
}
module.exports = async function (req, res) {
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res, 405, { error: 'Method not allowed' }); }
  try {
    if (req.headers.origin !== env('PULSE_PUBLIC_ORIGIN')) return reply(res, 403, { error: 'Invalid origin' });
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(res, 415, { error: 'JSON required' });
    if (Number(req.headers['content-length'] || 0) > 8192 || Buffer.byteLength(JSON.stringify(req.body ?? {})) > 8192)
      return reply(res, 413, { error: 'Too large' });
    const input = req.body || {};
    const email = clean(input.email, 254).toLowerCase(), type = input.type;
    const text = clean(input.message, 1500);
    const id = input.requestId || randomUUID();
    if (!EMAIL.test(email) || !TYPES.has(type) || !UUID.test(id) || text.length < 10)
      return reply(res, 400, { error: 'Please check your details' });
    if (input.website) return reply(res, 200, { ok: true });
    let message = text;
    if (type === 'cancellation') {
      const name = clean(input.name), contract = clean(input.contract), reason = clean(input.reason, 1000);
      const kind = input.cancellationKind, end = input.end;
      if (!name || !contract || !['ordinary', 'extraordinary'].includes(kind) ||
          !['next_possible', 'date'].includes(end) || (kind === 'extraordinary' && !reason))
        return reply(res, 400, { error: 'Cancellation details required' });
      let requestedEnd = 'Zum nächstmöglichen Zeitpunkt';
      if (end === 'date') {
        const date = clean(input.endDate, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
          return reply(res, 400, { error: 'Invalid requested end date' });
        requestedEnd = date;
      }
      message = ['Kündigungserklärung PULSE Personal', 'Name: ' + name, 'Vertrag: ' + contract,
        'Art: ' + (kind === 'ordinary' ? 'Ordentlich' : 'Ausserordentlich'), 'Gewünschtes Ende: ' + requestedEnd,
        ...(reason ? ['Begründung: ' + reason] : []), '', text].join('\n');
    } else if (type === 'withdrawal' || type === 'deletion') {
      if (type === 'withdrawal' && (!clean(input.name) || !clean(input.contract))) return reply(res, 400, { error: 'Withdrawal details required' });
      message = (type === 'withdrawal' ? 'WIDERRUF / RÜCKTRITT\nName: ' + clean(input.name) + '\nVertrag: ' + clean(input.contract) : 'KONTO- UND DATENLÖSCHUNG') + '\n\n' + text;
    }
    const source = req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const bucket = createHmac('sha256', env('PULSE_HEALTH_DATA_KEY')).update('support-ip:' + source).digest('hex');
    if (!await db('rpc/pulse_allow_checkout', '', 'POST', { p_bucket: bucket })) return reply(res, 429, { error: 'Too many requests' });
    const [prior] = await db('pulse_support_requests', `select=id,email,message,created_at&id=eq.${id}&limit=1`);
    if (prior) {
      if (prior.email !== email || prior.message !== message) return reply(res, 409, { error: 'Request reference already used' });
      return reply(res, 200, { ok: true, receipt: receipt(prior, type) });
    }
    const since = encodeURIComponent(new Date(Date.now() - 86400000).toISOString());
    const recent = await db('pulse_support_requests', 'select=id,email,message,created_at&email=eq.' + encodeURIComponent(email) + '&created_at=gte.' + since + '&order=created_at.desc&limit=20');
    const duplicate = recent.find(row => row.message === message);
    if (duplicate) return reply(res, 200, { ok: true, receipt: receipt(duplicate, type) });
    // Legal declarations remain receivable even if this address already sent several support questions.
    if (recent.length >= 3 && ['billing', 'other'].includes(type)) return reply(res, 429, { error: 'Too many requests; contact support' });
    let row;
    try {
      [row] = await db('pulse_support_requests', '', 'POST', { id, email, request_type: ['withdrawal', 'deletion'].includes(type) ? 'other' : type,
        message, status: 'open', source: 'website' });
    } catch (error) {
      if (error.message !== 'Database operation failed: 409') throw error;
      [row] = await db('pulse_support_requests', `select=id,email,message,created_at&id=eq.${id}&limit=1`);
      if (!row || row.email !== email || row.message !== message) return reply(res, 409, { error: 'Request reference already used' });
    }
    if (!row?.id || !row.created_at) throw new Error('Missing saved receipt');
    // Never send health or support data to an additional email provider.
    return reply(res, 201, { ok: true, receipt: receipt(row, type) });
  } catch (error) {
    console.error('PULSE support request error', error.name);
    return reply(res, 503, { error: 'Request could not be saved' });
  }
};
