#!/usr/bin/env node
/**
 * Test runner. Imports every tests/*.test.mjs (which register cases as a side
 * effect) and runs them, grouped by suite.
 *
 * Usage: node tools/test.mjs [--filter=<substring>] [--quiet]
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registry, AssertionError } from '../tests/_harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const filter = (args.find(a => a.startsWith('--filter=')) || '').split('=')[1] || '';
const quiet = args.includes('--quiet');

const files = readdirSync(join(ROOT, 'tests')).filter(f => f.endsWith('.test.mjs')).sort();
for (const f of files) await import(pathToFileURL(join(ROOT, 'tests', f)).href);

const cases = registry.filter(c => !filter || (c.suite + ' ' + c.name).includes(filter));
let pass = 0;
const failures = [];
let lastSuite = null;
const t0 = Date.now();

for (const c of cases) {
  if (c.suite !== lastSuite) {
    if (!quiet) console.log(`\n  ${c.suite}`);
    lastSuite = c.suite;
  }
  try {
    await c.run();
    pass++;
    if (!quiet) console.log(`    \x1b[32m✓\x1b[0m ${c.name}`);
  } catch (err) {
    failures.push({ c, err });
    if (!quiet) console.log(`    \x1b[31m✗\x1b[0m ${c.name}`);
  }
}

const ms = Date.now() - t0;
console.log(`\n  ${pass}/${cases.length} passed in ${ms}ms  (${files.length} files)`);

if (failures.length) {
  console.log('\n  failures:');
  for (const { c, err } of failures) {
    console.log(`\n  \x1b[31m${c.suite} › ${c.name}\x1b[0m`);
    console.log('  ' + (err instanceof AssertionError ? err.message : (err.stack || String(err)))
      .split('\n').join('\n  '));
  }
  process.exit(1);
}
