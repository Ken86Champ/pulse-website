'use strict';

const groups=[
{title:'Deine Kontaktdaten',message:'Hey! 👋 Ich bin PULSE. Schön, dass du da bist. Lass uns zuerst deine Kontaktdaten erfassen.',fields:[
['firstName','Vorname','text'],['lastName','Nachname','text'],['email','E-Mail-Adresse','email'],['phone','Telefonnummer','tel'],['street','Strasse und Hausnummer','text'],['postal','Postleitzahl','text'],['city','Ort','text'],['country','Land','country']]},
{title:'Über dich',message:'Super! Jetzt brauche ich ein paar Angaben für deine persönliche Planung.',fields:[
['birthDate','Geburtsdatum','date'],['sex','Geschlecht','select',['Weiblich','Männlich','Divers','Keine Angabe']],['height','Grösse in cm','number',100,240],['weight','Gewicht in kg','number',30,350],['job','Beruf','text'],['activity','Aktivität im Berufsalltag','select',['Überwiegend sitzend','Viel stehend','Viel gehend','Körperlich anstrengend']]]},
{title:'Deine Ziele',message:'Was möchtest du erreichen und was treibt dich an?',fields:[
['goal','Hauptziel','select',['Abnehmen & definieren','Muskelaufbau','Fitter & gesünder werden','Mehr Energie im Alltag','Ausdauer verbessern']],['targetWeight','Wunschgewicht in kg (nur bei Gewichtsziel)','optionalNumber',30,350],['motivation','Deine persönliche Motivation','textarea'],['challenge','Grösste Herausforderung','select',['Wenig Zeit','Motivation und Konstanz','Ernährung im Alltag','Unsicherheit beim Training','Anderes']]]},
{title:'Dein Training',message:'Damit dein Training wirklich in deinen Alltag passt:',fields:[
['currentTraining','Aktuelle Trainingshäufigkeit','select',['Noch gar nicht','1–2× pro Woche','3–4× pro Woche','5× oder öfter']],['plannedTraining','Gewünschte Trainingshäufigkeit','select',['1–2× pro Woche','3× pro Woche','4× pro Woche','5× oder öfter']],['days','Verfügbare Trainingstage (Mehrfachauswahl)','multi',['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']],['weeklyTime','Wöchentliches Zeitbudget','select',['1–2 Stunden','2–3 Stunden','3–5 Stunden','Mehr als 5 Stunden']],['location','Trainingsort','select',['Fitnessstudio','Zuhause','Draussen','Kombination']],['gymMember','Fitnessstudio-Mitgliedschaft','select',['Ja','Nein']],['equipment','Verfügbares Equipment (Mehrfachauswahl)','multi',['Keines','Kurzhanteln','Widerstandsbänder','Kettlebells','Trainingsbank','Fitnessgeräte','Anderes']],['equipmentOther','Welches weitere Equipment?','followupMulti','equipment','Anderes'],['duration','Zeit pro Training','select',['20–30 Minuten','30–45 Minuten','45–60 Minuten','Über 60 Minuten']],['experience','Trainingserfahrung','select',['Einsteiger','Etwas Erfahrung','Fortgeschritten']]]},
{title:'Deine Ernährung',message:'🥗 Jetzt zu deiner Ernährung. Tippe einfach an, was auf dich zutrifft – ich kümmere mich um den Rest.',fields:[
['diet','Machst du derzeit eine Diät?','select',['Nein','Ja, zum Abnehmen','Ja, zum Muskelaufbau','Ja, aus gesundheitlichen Gründen']],
['dietStyle','Wie ernährst du dich hauptsächlich?','select',['Allesesser / Mischkost','Vegetarisch (mit Milch/Eiern)','Vegan','Pescetarisch (Fisch, kein Fleisch)','Flexitarisch (wenig Fleisch)','Paleo / Steinzeiternährung','Keto / ketogen','Low Carb','Low Fat','Mediterran','High Protein / proteinreich','Intervallfasten','Clean Eating','Carnivore','Rohkost','Andere Ernährungsform']],
['dietStyleOther','Welche andere Ernährungsform?','followupOther','dietStyle','Andere Ernährungsform'],['dietRules','Welche Ernährungsregeln sollen wir berücksichtigen? (Mehrfachauswahl)','multi',['Keine besonderen Regeln','Halal','Koscher','Kein Schweinefleisch','Kein Rindfleisch','Kein Fisch / Meeresfrüchte','Ohne Alkohol','Glutenfrei','Laktosefrei','Zuckerarm','Andere']],
['dietRulesOther','Welche weiteren Ernährungsregeln?','followupMulti','dietRules','Andere'],['allergyTypes','Welche Allergien oder Unverträglichkeiten hast du? (Mehrfachauswahl)','multi',['Keine','Laktoseintoleranz','Histaminintoleranz','Fruktosemalabsorption','Sorbitunverträglichkeit','Gluten / Zöliakie','Weizenallergie','Milcheiweissallergie','Erdnussallergie','Baumnüsse','Ei','Soja','Fisch','Krustentiere','Weichtiere','Sesam','Sellerie','Senf','Lupinen','Schwefeldioxid / Sulfite','Eigene ergänzen']],
['allergies','Eigene Allergie oder Unverträglichkeit ergänzen','followupMulti','allergyTypes','Eigene ergänzen'],
['foodDislikes','Welche Lebensmittel magst du nicht oder möchtest du vermeiden?','optionalText']
]},
{title:'Gesundheitscheck',message:'💜 Deine Gesundheit ist wichtig. Wenn du eine Frage mit Ja beantwortest, frage ich direkt nach den Details.',fields:[
['medicalTreatment','Bist du zurzeit in ärztlicher Behandlung?','select',['Ja','Nein']],['medicalTreatmentDetails','Weswegen bist du in Behandlung?','followup','medicalTreatment'],
['medication','Nimmst du Medikamente?','select',['Ja','Nein']],['medicationDetails','Welche Medikamente? Bitte Name, Dosierung und Häufigkeit angeben.','followup','medication'],
['heart','Hast du Herz-Kreislauf-Erkrankungen oder -Beschwerden?','select',['Ja','Nein']],['heartDetails','Welche Erkrankungen oder Beschwerden?','followup','heart'],
['musculoskeletal','Hast du Verletzungen oder Beschwerden am Bewegungsapparat?','select',['Ja','Nein']],['musculoskeletalDetails','Welche Verletzungen oder Beschwerden? Wo genau?','followup','musculoskeletal'],
['respiratory','Hast du Atemwegserkrankungen?','select',['Ja','Nein']],['respiratoryDetails','Welche Atemwegserkrankungen?','followup','respiratory'],
['metabolic','Hast du Stoffwechselerkrankungen?','select',['Ja','Nein']],['metabolicDetails','Welche Stoffwechselerkrankungen?','followup','metabolic'],
['surgery','Hattest du Operationen, die für dein Training relevant sein könnten?','select',['Ja','Nein']],['surgeryDetails','Welche Operationen, wann und bestehen noch Einschränkungen?','followup','surgery'],
['otherHealth','Gibt es weitere gesundheitliche Einschränkungen?','select',['Ja','Nein']],['otherHealthDetails','Welche Einschränkungen müssen wir berücksichtigen?','followup','otherHealth'],
['smoking','Rauchst du?','select',['Ja','Nein','Keine Angabe']]
]},
{title:'Zum Abschluss',message:'Fast geschafft! Nur noch zwei letzte Angaben.',fields:[
['source','Wie hast du PULSE entdeckt?','select',['Google','Social Media','Empfehlung','10X Personal Training','Andere Quelle']],['confirmation','Ich bestätige, dass meine Angaben nach bestem Wissen richtig und vollständig sind.','checkbox']]}
];
const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');

const chat = document.getElementById('chat');
const progress = document.getElementById('progress');
const languageControl = document.getElementById('onboarding-language');
const draftControl = document.getElementById('onboarding-draft');
const draftNote = document.getElementById('onboarding-draft-note');
const draftKey = 'pulse-onboarding-draft-v1';
const draftLifetime = 30 * 60 * 1000;
const languages = ['de', 'en', 'fr', 'it'];
const exclusiveOptions = new Set(['Keine', 'Keine besonderen Regeln', 'Keines']);
const conditionalTypes = new Set(['followup', 'followupOther', 'followupMulti']);
const answers = {};
let index = 0;
let returnToSummary = false;
let language = 'de';
let keepDraft = false;
let storageError = false;
let formChanged = false;
let regionNames;

function tr(text) {
  return pulseOnboardingTranslations[language]?.[text] ?? text;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function loadDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey));
    if (!draft || draft.expiresAt <= Date.now() || !Number.isFinite(draft.expiresAt)
        || !Number.isInteger(draft.index) || draft.index < 0 || draft.index > groups.length) {
      sessionStorage.removeItem(draftKey);
      return;
    }
    for (const [id, , type, options] of groups.flatMap(group => group.fields)) {
      const value = draft.answers?.[id];
      if (type === 'multi' && Array.isArray(value)) {
        answers[id] = options.filter(option => value.includes(option));
      } else if (type === 'checkbox' && typeof value === 'boolean') {
        answers[id] = value;
      } else if (type !== 'multi' && type !== 'checkbox' && typeof value === 'string') {
        answers[id] = value.slice(0, 1000);
      }
    }
    index = draft.index;
    returnToSummary = draft.returnToSummary === true;
    language = languages.includes(draft.language) ? draft.language : 'de';
    keepDraft = true;
  } catch {
    storageError = true;
  }
}

function persistDraft() {
  try {
    if (keepDraft) {
      sessionStorage.setItem(draftKey, JSON.stringify({
        index, language, answers, returnToSummary, expiresAt: Date.now() + draftLifetime,
      }));
    } else {
      sessionStorage.removeItem(draftKey);
    }
    storageError = false;
  } catch {
    storageError = true;
    keepDraft = false;
  }
  draftControl.checked = keepDraft;
  draftNote.textContent = tr(storageError
    ? 'Der Browser konnte den Entwurf nicht speichern.'
    : 'Optional: Speichert deine Angaben inklusive Gesundheitsdaten in diesem Tab. Nach 30 Minuten ohne Eingabe ist der Entwurf beim nächsten Laden nicht mehr verfügbar.');
}

function localizePage() {
  document.documentElement.lang = language;
  document.title = 'PULSE – ' + tr('Dein persönliches Coaching beginnt hier');
  document.querySelector('.pulse-brand').setAttribute('aria-label', tr('PULSE Startseite'));
  document.querySelectorAll('[data-copy]').forEach(node => {
    node.textContent = tr(node.dataset.copy);
  });
  const heading = document.querySelector('.stage-heading h1');
  heading.replaceChildren(tr('Dein Weg beginnt') + ' ', el('em', null, tr('hier.')));
  languageControl.value = language;
  regionNames = new Intl.DisplayNames([language], { type: 'region' });
}

function readValue(control, type) {
  if (type === 'multi') return Array.from(control.querySelectorAll('input:checked'), input => input.value);
  if (type === 'select') return control.querySelector('input:checked')?.value ?? '';
  if (type === 'checkbox') return control.checked;
  return control.value.trim();
}

function isActive(definition, values) {
  const [, , type, parent, expected] = definition;
  if (type === 'followup') return values[parent] === 'Ja';
  if (type === 'followupOther') return values[parent] === expected;
  if (type === 'followupMulti') return Array.isArray(values[parent]) && values[parent].includes(expected);
  return true;
}

function createField(definition) {
  const [id, label, type, options, maximum] = definition;
  const isChoice = type === 'multi' || type === 'select';
  const optional = type === 'optionalText' || type === 'optionalNumber';
  const conditional = conditionalTypes.has(type);
  const box = el(isChoice ? 'fieldset' : 'div', 'field');
  const caption = el(isChoice ? 'legend' : 'label', 'field-label', tr(label) + (optional ? '' : ' *'));
  caption.id = id + '-label';
  let control;

  if (isChoice) {
    control = el('div', 'choice-grid');
    for (const value of options) {
      const choice = el('label', 'chip');
      const input = el('input');
      input.type = type === 'multi' ? 'checkbox' : 'radio';
      input.name = id;
      input.value = value;
      input.checked = type === 'multi' ? (answers[id] ?? []).includes(value) : answers[id] === value;
      if (type === 'multi') {
        input.addEventListener('change', () => {
          if (!input.checked) return;
          for (const other of control.querySelectorAll('input:checked')) {
            if (other !== input && (exclusiveOptions.has(value) || exclusiveOptions.has(other.value))) {
              other.checked = false;
            }
          }
        });
      }
      choice.append(input, document.createTextNode(tr(value)));
      control.appendChild(choice);
    }
  } else if (type === 'country') {
    control = el('select');
    const empty = el('option', null, tr('Land auswählen …'));
    empty.value = '';
    control.appendChild(empty);
    const countries = countryCodes.map(code => [code, regionNames.of(code)]);
    countries.sort((a, b) => a[1].localeCompare(b[1], language));
    for (const [code, name] of countries) {
      const option = el('option', null, name);
      option.value = code;
      control.appendChild(option);
    }
  } else if (conditional || type === 'textarea' || type === 'optionalText') {
    control = el('textarea');
    control.rows = 2;
    control.maxLength = 1000;
    if (id === 'allergies') control.placeholder = tr('z. B. Kiwi oder Tomaten');
  } else {
    control = el('input');
    control.type = type === 'optionalNumber' ? 'number' : type;
    if (control.type === 'number') {
      control.min = options;
      control.max = maximum;
      control.step = 'any';
    }
    if (type === 'text') control.maxLength = 200;
    if (type === 'tel') {
      control.maxLength = 40;
      control.autocomplete = 'tel';
    }
    if (type === 'date') {
      const today = new Date();
      control.max = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
        .map(part => String(part).padStart(2, '0')).join('-');
    }
  }

  control.dataset.key = id;
  if (!isChoice) {
    control.id = id;
    caption.htmlFor = id;
    control.required = !optional && !conditional;
    if (type === 'checkbox') control.checked = answers[id] === true;
    else control.value = answers[id] ?? '';
  }
  if (type === 'checkbox') {
    caption.prepend(control, document.createTextNode(' '));
    box.appendChild(caption);
  } else {
    box.append(caption, control);
  }
  return { definition, box, control };
}

function syncFields(fields) {
  const values = Object.fromEntries(fields.map(({ definition: [id, , type], control }) => [
    id, readValue(control, type),
  ]));
  for (const { definition, box, control } of fields) {
    if (!conditionalTypes.has(definition[2])) continue;
    const active = isActive(definition, values);
    box.hidden = !active;
    control.required = active;
    control.disabled = !active;
    if (!active) {
      control.value = '';
      values[definition[0]] = '';
    }
  }
  return values;
}

function validationIssue(definition, control, values) {
  const [id, , type] = definition;
  const value = values[id];
  if (!isActive(definition, values)) return '';
  if (control.validity?.badInput) return 'Bitte gib eine gültige Zahl ein.';
  if (value === '' || value === false || (Array.isArray(value) && value.length === 0)) {
    return type === 'optionalNumber' || type === 'optionalText' ? '' : 'Bitte fülle dieses Pflichtfeld aus.';
  }
  if (id === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (!/^\+?[0-9 ().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
      return 'Bitte gib eine gültige Telefonnummer ein.';
    }
  }
  if (id === 'postal' && values.country === 'CH' && !/^[1-9][0-9]{3}$/.test(value)) {
    return 'Bitte gib eine vierstellige Schweizer Postleitzahl ein.';
  }
  if (control.validity && !control.validity.valid) {
    return control.type === 'number' ? 'Bitte gib eine Zahl im erlaubten Bereich ein.' : 'Bitte prüfe diese Angabe.';
  }
  return '';
}

function bubble(message) {
  chat.appendChild(el('div', 'bubble bot', message));
}

function summaryValue([id, , type]) {
  const value = answers[id];
  if (Array.isArray(value)) return value.map(tr).join(', ');
  if (type === 'country') return value ? regionNames.of(value) : '—';
  if (type === 'checkbox') return value ? tr('Ja') : tr('Nein');
  if (type === 'select') return value ? tr(value) : '—';
  if (type === 'date' && value) {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' })
      .format(new Date(value + 'T00:00:00Z'));
  }
  if ((type === 'number' || type === 'optionalNumber') && value) {
    return new Intl.NumberFormat(language, { maximumFractionDigits: 10 }).format(Number(value));
  }
  return value || '—';
}

function goTo(nextIndex, focus = true) {
  index = nextIndex;
  persistDraft();
  draw(focus);
}

function finish() {
  bubble(tr('Du kannst jetzt alle deine Angaben überprüfen.'));
  const card = el('section', 'review');
  card.appendChild(el('h2', null, tr('Dein Coaching-Profil')));
  groups.forEach((group, step) => {
    const section = el('section', 'summary-section');
    const header = el('div', 'summary-heading');
    const edit = el('button', 'choice', tr('Bearbeiten'));
    edit.type = 'button';
    edit.setAttribute('aria-label', tr('Bearbeiten') + ' – ' + tr(group.title));
    edit.onclick = () => {
      returnToSummary = true;
      goTo(step);
    };
    header.append(el('h3', null, tr(group.title)), edit);
    const list = el('dl', 'summary-values');
    for (const field of group.fields) {
      if (!isActive(field, answers)) continue;
      const row = el('div');
      row.append(el('dt', null, tr(field[1])), el('dd', null, summaryValue(field)));
      list.appendChild(row);
    }
    section.append(header, list);
    card.appendChild(section);
  });
  card.appendChild(el('p', 'muted', tr('Deine Angaben wurden noch nicht serverseitig gespeichert. Der Checkout ist noch nicht aktiviert.')));
  if (keepDraft) {
    const clear = el('button', 'choice', tr('Entwurf löschen'));
    clear.type = 'button';
    clear.onclick = () => {
      Object.keys(answers).forEach(key => delete answers[key]);
      keepDraft = false;
      formChanged = false;
      goTo(0);
    };
    const actions = el('div', 'summary-actions');
    actions.appendChild(clear);
    card.appendChild(actions);
  }
  chat.appendChild(card);
}

function draw(focus = false) {
  localizePage();
  chat.replaceChildren();
  progress.style.width = Math.round(index / groups.length * 100) + '%';
  const group = groups[index];
  if (!group) {
    finish();
  } else {
    bubble(tr(group.message));
    const card = el('section', 'review');
    card.appendChild(el('h2', null, tr(group.title)));
    const form = el('form');
    form.noValidate = true;
    const fields = group.fields.map(createField);
    for (const { box } of fields) form.appendChild(box);
    const error = el('p', 'error');
    error.setAttribute('role', 'alert');
    error.id = 'onboarding-error';
    const actions = el('div', 'form-actions');
    function clearError() {
      error.textContent = '';
      for (const invalid of form.querySelectorAll('[aria-invalid]')) {
        invalid.removeAttribute('aria-invalid');
        invalid.removeAttribute('aria-describedby');
      }
    }
    function recordInput(event) {
      // Checkbox choices emit change after their exclusivity handlers have run.
      if (event.type === 'input' && ['checkbox', 'radio'].includes(event.target.type)) return;
      if (event.type === 'change' && !['checkbox', 'radio'].includes(event.target.type)) return;
      clearError();
      Object.assign(answers, syncFields(fields));
      formChanged = true;
      if (keepDraft) persistDraft();
    }
    form.addEventListener('input', recordInput);
    form.addEventListener('change', recordInput);
    if (index > 0 && !returnToSummary) {
      const back = el('button', 'choice', tr('Zurück'));
      back.type = 'button';
      back.onclick = () => {
        Object.assign(answers, syncFields(fields));
        goTo(index - 1);
      };
      actions.appendChild(back);
    }
    const nextLabel = returnToSummary ? 'Änderungen übernehmen' : index === groups.length - 1 ? 'Zusammenfassung ansehen' : 'Weiter';
    const next = el('button', 'primary', tr(nextLabel));
    next.type = 'submit';
    actions.appendChild(next);
    form.append(error, actions);
    form.onsubmit = event => {
      event.preventDefault();
      clearError();
      const values = syncFields(fields);
      for (const { definition, box, control } of fields) {
        const issue = validationIssue(definition, control, values);
        if (!issue) continue;
        const target = control.matches('input,select,textarea') ? control : control.querySelector('input');
        box.appendChild(error);
        error.textContent = tr(issue) + ' ' + tr(definition[1]);
        target.setAttribute('aria-invalid', 'true');
        target.setAttribute('aria-describedby', error.id);
        target.focus();
        box.scrollIntoView({ block: 'center' });
        return;
      }
      Object.assign(answers, values);
      formChanged = true;
      const nextIndex = returnToSummary ? groups.length : index + 1;
      returnToSummary = false;
      goTo(nextIndex);
    };
    card.appendChild(form);
    chat.appendChild(card);
    syncFields(fields);
  }
  if (focus) {
    const heading = chat.querySelector('h2');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

languageControl.addEventListener('change', () => {
  language = languageControl.value;
  persistDraft();
  draw();
});
draftControl.addEventListener('change', () => {
  keepDraft = draftControl.checked;
  persistDraft();
  if (index === groups.length) draw();
});
window.addEventListener('beforeunload', event => {
  if (keepDraft || !formChanged) return;
  event.preventDefault();
  event.returnValue = '';
});

loadDraft();
persistDraft();
draw();
