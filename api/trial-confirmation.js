'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { config, db, reply } = require('../lib/onboarding-server');
module.exports = async function(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Methode nicht erlaubt' });
  try {
    const { mode, tenant } = config(), id = req.query?.session_id;
    if (typeof id !== 'string' || !new RegExp(`^cs_${mode}_[A-Za-z0-9]{15,200}$`).test(id)) return reply(res, 400, { error: 'Ungültige Sitzung' });
    const [trial] = await db('pulse_trials', `select=customer_id,status,created_at,ready_at,trial_end&stripe_checkout_session_id=eq.${id}&tenant_id=eq.${tenant}&mode=eq.${mode}&limit=1`);
    if (!trial?.customer_id) return reply(res, 404, { error: 'Bestellung noch nicht bestätigt' });
    const dates = [trial.created_at, trial.ready_at, trial.trial_end].map(value => value ? new Date(value).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' }) : 'Noch nicht gestartet');
    const text = `<section><h2>Deine Testbestätigung</h2><p>Bestellung: ${dates[0]}<br>Teststart: ${dates[1]}<br>Testende: ${dates[2]} (Schweizer Zeit)</p><p>Bei der Anmeldung wird kein Abo-Betrag abgebucht. Nach den sieben kostenlosen Tagen CHF 98 pro Monat. Kündigung vor Testende verhindert Abo-Kosten. Monatlich kündbar.</p></section>`;
    const html = readFileSync(join(__dirname, '..', 'legal/versions/pulse-trial-2026-11-27-v1.html'), 'utf8').replace(/<main[^>]*>/, match => match + text);
    res.setHeader('Cache-Control', 'no-store');res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');res.setHeader('Content-Disposition', 'attachment; filename="PULSE-Testbestaetigung.html"');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.statusCode = 200;return res.end(html);
  } catch(error) {
    console.error('pulse_testbestaetigung_fehlgeschlagen', error.name);
    return reply(res, 503, { error: 'Bestätigung vorübergehend nicht verfügbar' });
  }
};
