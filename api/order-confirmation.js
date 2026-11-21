const Stripe = require('stripe');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { db, config, reply } = require('../lib/onboarding-server');
const VERSIONS = new Set(['pulse-privacy-terms-2026-11-21-intl-v1', 'pulse-privacy-terms-2026-11-21-dach-v2']);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function documentFor(session, row) {
  if (!VERSIONS.has(row.consent_version)) return null;
  const conditions = readFileSync(join(__dirname, '..', 'legal', 'versions', row.consent_version + '.html'), 'utf8');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>PULSE Vertragsbestätigung</title><style>body{max-width:860px;margin:40px auto;padding:0 24px;font:16px/1.65 system-ui,sans-serif;color:#201a34}h1,h2,h3{line-height:1.25}a{color:#5632c9}p,li,address{overflow-wrap:anywhere}hr{margin:44px 0}nav{display:none}@media print{body{margin:0}}</style></head><body><h1>PULSE Personal – Vertragsbestätigung</h1><p>10X Group GmbH · Ulmenstrasse 11 · 9000 St. Gallen · Schweiz<br>hello.pulse.coach@gmail.com</p><p>Bestellung: ${escape(session.id)}<br>Zahlung: bestätigt<br>Vertragsschluss / Zahlung bestätigt (UTC): ${escape(new Date(row.created_at).toISOString())}<br>E-Mail: ${escape(row.email)}<br>Bedingungsfassung: ${escape(row.consent_version)}</p><p>CHF 98 pro Monat einschliesslich allfälliger anwendbarer Steuern. Erste Laufzeit ein Monat; danach monatliche Verlängerung. Jederzeit zum Ende der laufenden bezahlten Abrechnungsperiode kündbar, ohne zusätzliche Kündigungsfrist. Zahlungsabwicklung durch Stripe.</p><p>Dein persönlicher Fitness- und Ernährungsassistent über einen unterstützten Messenger mit Coaching-App. Die Gesundheitsprüfung, Einrichtung der Pläne und Freischaltung übernimmt dein Coach. Diese Zahlungsbestätigung ist keine Freigabe für Training trotz gesundheitlicher Einschränkungen.</p><p>Du hast die Mitgliedschaftsbedingungen angenommen und ausdrücklich in die für das Coaching erforderliche Verarbeitung deiner Gesundheitsdaten gemäss der unten enthaltenen Datenschutzerklärung eingewilligt. Du kannst diese Einwilligung mit Wirkung für die Zukunft widerrufen.</p><p>Mitgliedschaft verwalten: https://pulse-website-xi.vercel.app/abo-kuendigen.html<br>Widerruf: https://pulse-website-xi.vercel.app/widerruf.html<br>Support: https://pulse-website-xi.vercel.app/kontakt.html</p><hr>${conditions}</body></html>`;
}
module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return reply(res, 405, { error: 'Method not allowed' }); }
  if (process.env.PULSE_SECURE_ONBOARDING_ENABLED !== 'true') return reply(res, 503, { error: 'Unavailable' });
  const id = req.query?.session_id;
  if (typeof id !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{15,200}$/.test(id)) return reply(res, 400, { error: 'Invalid session' });
  try {
    const { stripeKey, mode, tenant } = config();
    if (!id.startsWith('cs_' + mode + '_')) return reply(res, 404, { error: 'Not found' });
    const [row] = await db('pulse_coaching_customers', `select=email,created_at,consent_version,stripe_customer_id&stripe_checkout_session_id=eq.${id}&tenant_id=eq.${tenant}&limit=1`);
    if (!row) return reply(res, 404, { error: 'Not found' });
    const stripe = new Stripe(stripeKey, { maxNetworkRetries: 1, timeout: 8000 });
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.livemode !== (mode === 'live') || session.customer !== row.stripe_customer_id || session.payment_status !== 'paid' || session.mode !== 'subscription')
      return reply(res, 403, { error: 'Membership not verified' });
    const html = documentFor(session, row);
    if (!html) return reply(res, 409, { error: 'Historical terms require support confirmation' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="PULSE-Vertragsbestaetigung.html"');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.statusCode = 200; return res.end(html);
  } catch {
    return reply(res, 503, { error: 'Confirmation temporarily unavailable' });
  }
};
module.exports.documentFor = documentFor;
