// Server-only encryption for sensitive PULSE onboarding fields.
// Never import this module into browser code. Configure PULSE_HEALTH_DATA_KEY
// as 32 random bytes encoded in base64, independently of Stripe/Supabase keys.
const crypto = require('node:crypto');
const VERSION = 'aes-256-gcm:v1';
function key() {
  const raw = process.env.PULSE_HEALTH_DATA_KEY;
  if (!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw)) throw new Error('PULSE_HEALTH_DATA_KEY is not configured');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length !== 32) throw new Error('Invalid encryption key length');
  return bytes;
}
function encryptHealthData(value, context) {
  if (!context || !/^[0-9a-f-]{36}$/i.test(context)) throw new Error('Invalid record context');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: VERSION, iv: iv.toString('base64'), ciphertext: data.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
function decryptHealthData(envelope, context) {
  if (!envelope || envelope.version !== VERSION || !context) throw new Error('Unsupported envelope or context');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}
module.exports = { encryptHealthData, decryptHealthData };
