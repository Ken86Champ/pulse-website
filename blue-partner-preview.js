(() => {
  'use strict';
  const program = document.getElementById('calc-program');
  const count = document.getElementById('calc-count');
  const application = document.getElementById('apply-program');
  const currency = value => 'CHF ' + new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 }).format(value);
  const set = (id, value) => { document.getElementById(id).textContent = value; };
  function calculate() {
    if (!count.checkValidity()) {
      set('calc-rate', 'Bitte eine ganze Zahl zwischen 0 und 10’000 eingeben.');
      set('calc-month', '—'); set('calc-year', '—');
      set('calc-assumption', 'Für diese Eingabe ist noch keine Berechnung möglich.');
      return;
    }
    const n = Number(count.value), kind = program.value;
    set('count-label', kind === 'referral' ? 'Qualifizierte Empfehlungen' : 'Aktive qualifizierte Abos');
    if (kind === 'referral') {
      set('calc-rate', '1 kostenloser Mitgliedschaftsmonat pro qualifizierter Empfehlung');
      set('calc-month-label', 'Mitgliedschaftsgutschrift');
      set('calc-month', n + (n === 1 ? ' Gratismonat' : ' Gratismonate'));
      set('calc-year-label', 'Art des Vorteils');
      set('calc-year', 'Gutschrift');
      set('calc-assumption', 'Einmalige Gutschrift für ' + n + ' qualifizierte Empfehlungen bei CHF 98 Monatsbeitrag. Keine Geldprovision, keine Auszahlung und keine monatliche oder jährliche Wiederholung.');
      return;
    }
    const rate = kind === 'creator' ? .30 : n >= 50 ? .35 : n >= 10 ? .30 : .25;
    const monthly = Math.round(n * 98 * rate * 100) / 100;
    set('calc-rate', n + ' aktive Abos · ' + Math.round(rate * 100) + ' % Provision');
    set('calc-month-label', 'Potenzial pro Monat'); set('calc-month', currency(monthly));
    set('calc-year-label', 'Über 12 Monate'); set('calc-year', currency(monthly * 12));
    set('calc-assumption', 'Annahme: Alle ' + n + ' Abos bleiben zwölf Monate aktiv und vollständig bezahlt. Keine Rückerstattungen; ' + (kind === 'creator' ? 'jede Vermittlung liegt innerhalb des zwölfmonatigen Creator-Provisionszeitraums.' : 'die Staffel bleibt unverändert. Die zwölf Monate sind ein Rechenzeitraum, keine zugesagte Coach-Provisionsdauer.'));
  }
  program.addEventListener('change', calculate); count.addEventListener('input', calculate);
  document.querySelectorAll('[data-program]').forEach(button => button.addEventListener('click', () => {
    application.value = button.dataset.program; program.value = button.dataset.program; calculate();
    document.getElementById('bewerbung').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    application.focus({ preventScroll: true });
  }));
  document.getElementById('partner-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const result = document.getElementById('form-result'); result.hidden = false; result.focus({ preventScroll: true });
  });
  document.getElementById('partner-submit').disabled = false;
  calculate();
})();
