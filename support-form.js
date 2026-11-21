'use strict';
(() => {
  const form = document.getElementById('supportForm');
  if (!form) return;
  const type = document.getElementById('type'), message = document.getElementById('message');
  const feedback = document.getElementById('feedback'), send = document.getElementById('send');
  for (const [value, label] of [['withdrawal', 'Widerruf / Rücktritt'], ['deletion', 'Konto und Daten löschen']]) {
    if (!form.dataset.withdrawal && !type.querySelector('option[value="' + value + '"]')) type.add(new Option(label, value));
  }
  const cancellation = document.createElement('div');
  cancellation.innerHTML = `<label for="cancelName">Vor- und Nachname *</label><input id="cancelName" autocomplete="name" maxlength="200">
<label for="cancelContract">Vertrag / Mitgliedschaft *</label><input id="cancelContract" maxlength="200" value="PULSE Personal – monatliche Mitgliedschaft">
<div id="cancelOnly"><label for="cancelKind">Art der Kündigung *</label><select id="cancelKind"><option value="ordinary">Ordentliche Kündigung</option><option value="extraordinary">Ausserordentliche Kündigung</option></select>
<label for="cancelReason">Kündigungsgrund (bei ausserordentlicher Kündigung erforderlich)</label><textarea id="cancelReason" maxlength="1000"></textarea>
<label for="cancelEnd">Gewünschtes Vertragsende *</label><select id="cancelEnd"><option value="next_possible">Zum nächstmöglichen Zeitpunkt</option><option value="date">Zu einem angegebenen Datum</option></select>
<div id="cancelDateBox" hidden><label for="cancelDate">Gewünschtes Enddatum *</label><input id="cancelDate" type="date"></div></div>`;
  form.insertBefore(cancellation, message.previousElementSibling);
  const q = id => document.getElementById(id);
  function update() {
    const active = type.value === 'cancellation', identity = active || type.value === 'withdrawal'; cancellation.hidden = !identity;
    q('cancelOnly').hidden = !active;
    q('cancelName').required = q('cancelContract').required = identity;
    q('cancelReason').required = active && q('cancelKind').value === 'extraordinary';
    q('cancelDateBox').hidden = q('cancelEnd').value !== 'date';
    q('cancelDate').required = active && q('cancelEnd').value === 'date';
    send.textContent = active ? 'Jetzt kündigen' : type.value === 'withdrawal' ? 'Widerruf bestätigen' : 'Anfrage senden';
  }
  type.addEventListener('change', () => {
    message.value = type.value === 'cancellation' ? 'Hiermit kündige ich meine PULSE Personal Mitgliedschaft zum oben angegebenen Zeitpunkt.' :
      type.value === 'withdrawal' ? 'Hiermit widerrufe ich meinen Vertrag über PULSE Personal / trete von diesem zurück.' :
      type.value === 'deletion' ? 'Bitte löscht mein PULSE-Konto und meine Coaching-Daten. Bitte prüft notwendige Aufbewahrungspflichten und bestätigt die Bearbeitung.' : '';
    update();
  });
  q('cancelKind').addEventListener('change', update); q('cancelEnd').addEventListener('change', update); update();
  let requestId, lastPayload, receiptUrl;
  const downloads = document.createElement('p'); downloads.hidden = true; form.appendChild(downloads);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const input = { email: q('email').value.trim(), type: type.value, message: message.value.trim(), website: q('website').value };
    if (['cancellation', 'withdrawal'].includes(type.value)) Object.assign(input, { name: q('cancelName').value, contract: q('cancelContract').value,
      cancellationKind: q('cancelKind').value, reason: q('cancelReason').value, end: q('cancelEnd').value, endDate: q('cancelDate').value });
    const payload = JSON.stringify(input);
    if (payload !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = payload; }
    send.disabled = true; feedback.textContent = 'Deine Erklärung wird sicher übermittelt …'; feedback.className = 'alert';
    try {
      const response = await fetch('/api/support-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId }) });
      const data = await response.json();
      if (!response.ok || !data.receipt) throw Error('Request failed');
      const r = data.receipt;
      const text = ['PULSE – elektronische Eingangsbestätigung', r.provider, 'Referenz: ' + r.id,
        'Eingang (UTC): ' + r.receivedAt, 'E-Mail: ' + r.email, '',
        'Diese Erklärung wurde über die Bestätigungsschaltfläche der PULSE-Website abgegeben und gespeichert:', r.message, '', r.note].join('\n');
      feedback.textContent = r.note + ' Referenz: ' + r.id + '. Eingang: ' + new Date(r.receivedAt).toLocaleString('de-CH') + '. Bitte speichere die Bestätigung.';
      feedback.className = 'alert success';
      if (receiptUrl) URL.revokeObjectURL(receiptUrl);
      receiptUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const download = document.createElement('a'); download.href = receiptUrl; download.download = 'PULSE-Eingangsbestätigung-' + r.id + '.txt';
      download.textContent = 'Eingangsbestätigung speichern'; download.className = 'secondary'; downloads.replaceChildren(download); downloads.hidden = false;
    } catch {
      feedback.textContent = 'Die Übermittlung konnte nicht bestätigt werden. Bitte versuche es erneut oder kontaktiere hello.pulse.coach@gmail.com.';
      feedback.className = 'alert error';
    } finally { send.disabled = false; }
  });
})();
