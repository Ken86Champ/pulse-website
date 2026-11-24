const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const page = fs.readFileSync('personal-v4.html', 'utf8');
const trial = fs.readFileSync('personal-trial-preview.html', 'utf8');
for (const [name, html] of [['V4', page], ['trial preview', trial]]) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, name + ': duplicate IDs');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, name + ': exactly one H1');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(match[1])) new vm.Script(match[2], { filename: name + '-inline.js' });
  }
  assert.match(html, /noindex,nofollow/);
}
const trialLinks = [...page.matchAll(/<a\b[^>]*href="personal-trial-preview\.html"[^>]*>([\s\S]*?)<\/a>/g)];
assert.equal(trialLinks.length, 4, 'All four conversion CTAs share the trial preview route');
assert.ok(trialLinks.every(match => match[1] === '7 Tage kostenlos testen'));
assert.doesNotMatch(page, /<a\b[^>]*href="onboarding\.html/);
assert.doesNotMatch(trial, /<form\b/);
assert.doesNotMatch(trial, /\bfetch\s*\(/);
assert.match(trial, /<button\b[^>]*disabled/);
assert.match(page, /Der 7-Tage-Test ist noch nicht freigeschaltet/);
assert.match(page, /Danach CHF 98 pro Monat/);
assert.match(page, /ab bereitgestelltem Zugang/);
for (const id of ['heroMessages', 'xp-chat', 'pulse-slider-next', 'pulse-intro-video', 'app', 'preise', 'pulse-trial-faq']) {
  assert.ok(page.includes('id="' + id + '"'), 'Product interaction hook preserved: ' + id);
}
for (const match of page.matchAll(/<link\b[^>]*href="([^"]+\.css)(?:\?[^"]*)?"[^>]*>/g)) {
  assert.ok(fs.existsSync(match[1]), 'Stylesheet exists: ' + match[1]);
}
console.log('PULSE V4 source checks passed; trial preview cannot submit data or start a payment.');
