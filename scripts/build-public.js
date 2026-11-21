'use strict';
const { rmSync, mkdirSync, readdirSync, copyFileSync, cpSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..'), output = join(root, 'public');
rmSync(output, { recursive: true, force: true }); mkdirSync(output);
for (const file of readdirSync(root)) {
  if (/\.(html|css)$/.test(file) || ['onboarding-schema.js', 'checkout-availability.js', 'support-form.js'].includes(file))
    copyFileSync(join(root, file), join(output, file));
}
cpSync(join(root, 'assets'), join(output, 'assets'), { recursive: true });
console.log('Public assets built; server libraries, tests, SQL and source documents excluded.');
