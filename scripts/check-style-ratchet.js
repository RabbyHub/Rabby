#!/usr/bin/env node

// Fails when a legacy styling approach grows. The counts in
// style-ratchet.json may only go down; run with --update after a migration
// lowers them. See "Styling Conventions" in AGENTS.md.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE_FILE = path.join(__dirname, 'style-ratchet.json');

const METRICS = {
  styledComponentsFiles: 'files importing styled-components',
  lessFiles: '.less files',
  topLevelAntOverrides: 'top-level .ant-* rules in .less files',
  // Legacy styles live in @layer legacy, where !important beats every
  // Tailwind class, including !-prefixed ones.
  legacyImportant: '!important in .less/.css files',
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function measure() {
  const files = walk(SRC);
  const read = (file) => fs.readFileSync(file, 'utf8');

  const scripts = files.filter((f) => /\.(t|j)sx?$/.test(f));
  const less = files.filter((f) => f.endsWith('.less'));
  const css = files.filter((f) => f.endsWith('.css'));

  return {
    styledComponentsFiles: scripts.filter((f) =>
      /from ['"]styled-components['"]/.test(read(f))
    ).length,
    lessFiles: less.length,
    topLevelAntOverrides: less.reduce(
      (sum, f) => sum + (read(f).match(/^\.ant-/gm) || []).length,
      0
    ),
    legacyImportant: [...less, ...css].reduce(
      (sum, f) => sum + (read(f).match(/!important/g) || []).length,
      0
    ),
  };
}

const current = measure();

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`);
  console.log('style-ratchet.json updated:', current);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
let failed = false;

for (const [key, label] of Object.entries(METRICS)) {
  const now = current[key];
  const max = baseline[key];
  if (now > max) {
    failed = true;
    console.error(`✗ ${label}: ${now} (baseline ${max}). Do not add new ones.`);
  } else if (now < max) {
    console.log(`✓ ${label}: ${now}, below baseline ${max}.`);
  } else {
    console.log(`✓ ${label}: ${now}`);
  }
}

if (failed) {
  console.error(
    '\nUse Tailwind, or a .module.css file for antd overrides (AGENTS.md, "Styling Conventions").'
  );
  process.exit(1);
}

if (Object.keys(METRICS).some((key) => current[key] < baseline[key])) {
  console.log('\nCounts went down. Run `yarn check:style --update` and commit the new baseline.');
}
