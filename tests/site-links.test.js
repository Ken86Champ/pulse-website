'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const vm = require('node:vm');
test('Alle Webseiten: lokale Verweise, Bildbeschreibungen, Anker und Inline-Skripte', () => {
  const files = readdirSync('.').filter(f => f.endsWith('.html'));
  const pages = new Map(files.map(f => [f, readFileSync(f, 'utf8')]));
  let references = 0;
  for (const [file, html] of pages) {
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, `${file}: doppelte IDs`);
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/\bsrc=|application\/ld\+json/.test(script[1])) new vm.Script(script[2], { filename: file });
    }
    for (const img of html.matchAll(/<img\b[^>]*>/g)) assert.match(img[0], /\balt\s*=/, `${file}: Bildbeschreibung fehlt`);
    for (const tag of html.matchAll(/<(?:a|img|script|link|source|video)\b[^>]*>/g)) {
      for (const ref of tag[0].matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/g)) {
        const url = ref[1].replace(/&amp;/g, '&');
        if (/^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/.test(url) || url.includes('{')) continue;
        const [pathQuery, hash] = url.split('#'), path = pathQuery.split('?')[0];
        const target = !path ? file : path === '/' ? 'index.html' : path.replace(/^\//, '');
        if (target.startsWith('api/')) assert.ok(existsSync(target + '.js'), `${file}: ${url}`);
        else assert.ok(existsSync(resolve(dirname(file), target)), `${file}: ${url}`);
        if (hash && pages.has(target)) assert.ok(new RegExp(`\\bid=["']${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(pages.get(target)), `${file}: Anker ${url}`);
        references++;
      }
    }
  }
  assert.ok(references > 400);
});
