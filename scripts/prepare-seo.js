'use strict';
const { readFileSync, writeFileSync, readdirSync, copyFileSync } = require('node:fs');
const { join } = require('node:path');
const output = join(__dirname, '..', 'public');
const production = process.env.VERCEL_ENV === 'production';
const origin = 'https://pulse-website-xi.vercel.app';
const pages = {
  'index.html': ['/', 'PULSE – Dein persönlicher Fitness-Assistent', 'Dein Ziel. Dein Plan. Tägliche Begleitung über Chat und App. Training, Ernährung und Fortschritt an einem Ort.'],
  'unternehmen.html': ['/unternehmen.html', 'PULSE Business – Mehr Kunden. Weniger Aufwand.', 'Für Fitnessstudios und Fitnessanbieter: tägliche Kundenbegleitung, intelligente Trainings- und Ernährungssteuerung und Kundenmanagement. PULSE live kennenlernen.'],
  'affiliate.html': ['/affiliate.html', 'PULSE Partnerprogramm', 'Empfiehl PULSE und werde Partner. Informationen zu Provisionen, monatlicher Auszahlung und den verbindlichen Partnerbedingungen.'],
  'kontakt.html': ['/kontakt.html', 'PULSE – Kontakt und Support', 'Fragen zu PULSE, deiner Mitgliedschaft oder einer Zusammenarbeit? Hier erreichst du den PULSE-Support.'],
};
const escape = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
copyFileSync(join(output, 'personal-v4.html'), join(output, 'index.html'));
for (const name of readdirSync(output).filter(name => name.endsWith('.html'))) {
  const file = join(output, name), entry = pages[name];
  let html = readFileSync(file, 'utf8');
  html = html.replace(/<meta\b[^>]*name=["'](?:robots|description)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*(?:property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*>/gi, '');
  const canonical = origin + (entry?.[0] ?? (name === 'personal-v4.html' ? '/' : '/' + name));
  let head = `<meta name="robots" content="${production && entry ? 'index,follow' : 'noindex,follow'}"><link rel="canonical" href="${canonical}">`;
  if (entry) {
    const [, title, description] = entry;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`);
    head += `<meta name="description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="de_CH"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary">`;
    head += '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: 'de-CH', isPartOf: { '@type': 'WebSite', name: 'PULSE', url: origin + '/' } }) + '</script>';
  }
  writeFileSync(file, html.replace(/<\/head>/i, head + '</head>'));
}
writeFileSync(join(output, 'robots.txt'), production ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /onboarding\nDisallow: /personal-\nDisallow: /business-betreuungstag.html\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
writeFileSync(join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + Object.values(pages).map(([path]) => `<url><loc>${origin}${path}</loc></url>`).join('') + '</urlset>\n');
writeFileSync(join(output, 'llms.txt'), `# PULSE\n\nPersönliche Fitnessbegleitung über Chat und App; PULSE Business für Fitnessanbieter.\n\n- [Privatkunden](${origin}/): Training, Ernährung und tägliche Begleitung.\n- [Business](${origin}/unternehmen.html): Kundenbetreuung und Kundenmanagement für Fitnessanbieter.\n- [Partnerprogramm](${origin}/affiliate.html): Partnerschaft und Konditionen.\n- [Kontakt](${origin}/kontakt.html)\n- [AGBs](${origin}/agb.html)\n- [Datenschutz](${origin}/datenschutz.html)\n\nVerbindliche Preise und Bedingungen stehen auf den jeweiligen Seiten.\n`);
console.log(`SEO vorbereitet: ${production ? 'Produktion mit vier kanonischen Seiten' : 'Vorschau bleibt von Indexierung ausgeschlossen'}.`);
