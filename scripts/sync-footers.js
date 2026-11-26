'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const check = process.argv.includes('--check');
const stylesheet = '<link rel="stylesheet" href="site-footer.css?v=20261126-1">';
const files = fs.readdirSync(root).filter(name => name.endsWith('.html'));
let count = 0;

function footer(name) {
  const terms = ['affiliate.html', 'affiliate-agb.html'].includes(name) ? 'affiliate-agb.html' : 'agb.html';
  const links = [
    ['personal-v4.html', 'Für Privatkunden'],
    ['unternehmen.html', 'Für Unternehmen'],
    ['affiliate.html', 'Partnerprogramm'],
    ['personal-v4.html#app-download', 'App-Vorschau'],
    ['impressum.html', 'Impressum'],
    ['datenschutz.html', 'Datenschutz'],
    [terms, 'AGBs'],
    ['disclaimer.html', 'Gesundheits-/KI-Hinweis'],
    ['abo-kuendigen.html', 'Abo kündigen'],
    ['widerruf.html', 'Widerruf'],
    ['kontakt.html', 'Kontakt &amp; Support'],
  ];
  assert.equal(new Set(links.map(([href]) => href)).size, links.length);
  for (const [href] of links) assert.ok(fs.existsSync(path.join(root, href.split('#')[0])), href);
  return `<footer id="pulse-footer" aria-label="PULSE Seiteninformationen">
  <div class="pulse-footer-inner">
    <div class="pulse-footer-top"><a class="pulse-footer-brand" href="personal-v4.html" aria-label="PULSE Startseite"><span class="pulse-footer-badge"><svg aria-hidden="true" viewBox="0 0 32 32"><path d="M2 16h7l4-8 5 16 4-8h8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.7"/></svg></span>PULSE</a><p>Dein Ziel. Dein Plan. Tägliche Begleitung über Chat und App.</p></div>
    <nav class="pulse-footer-links" aria-label="PULSE Seiten und Rechtliches">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
    <p class="pulse-footer-copyright">© 2026 10X Group GmbH</p>
  </div>
</footer>`;
}

for (const name of files) {
  const filename = path.join(root, name);
  const source = fs.readFileSync(filename, 'utf8');
  if (!/<footer\b/i.test(source) && name !== 'onboarding.html') continue;
  // Remove only the separately appended duplicate contract-management row.
  let output = source.replace(/<nav\b[^>]*aria-label="Vertrag verwalten"[^>]*>[\s\S]*?<\/nav>/g, '');
  const component = footer(name);
  if (/<footer\b/i.test(output)) output = output.replace(/<footer\b[\s\S]*?<\/footer>/, component);
  else output = output.replace('</body>', component + '</body>');
  if (!output.includes(stylesheet)) output = output.replace('</head>', stylesheet + '\n</head>');
  assert.equal((output.match(/<footer\b/g) || []).length, 1, name);
  assert.ok(!/aria-label="Vertrag verwalten"/.test(output), name);
  if (check) assert.equal(source, output, `Footer out of sync: ${name}`);
  else fs.writeFileSync(filename, output);
  count++;
}
console.log(`${check ? 'Checked' : 'Synchronized'} ${count} identical footers; affiliate AGBs use their own destination.`);
