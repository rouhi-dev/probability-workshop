/**
 * Minimal zero-dependency test harness.
 *
 * Test files import { suite, test, assert, loadModules } and register cases as a
 * side effect of being imported; tools/test.mjs imports them and runs the registry.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const registry = [];

let current = 'ungrouped';
export function suite(name) { current = name; }
export function test(name, run) { registry.push({ suite: current, name, run }); }

export class AssertionError extends Error {}

function fail(msg) { throw new AssertionError(msg); }

export const assert = {
  ok(v, msg = 'expected a truthy value') { if (!v) fail(`${msg} (got ${JSON.stringify(v)})`); },
  equal(a, b, msg = 'values differ') {
    if (a !== b) fail(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  },
  deep(a, b, msg = 'structures differ') {
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) fail(`${msg}:\n  expected ${sb}\n  got      ${sa}`);
  },
  close(a, b, tol, msg = 'number out of tolerance') {
    if (!(Math.abs(a - b) <= tol)) fail(`${msg}: |${a} - ${b}| > ${tol}`);
  },
  empty(arr, msg = 'expected no items') {
    if (arr.length) fail(`${msg}:\n  - ${arr.join('\n  - ')}`);
  },
  match(str, re, msg = 'pattern not found') { if (!re.test(str)) fail(`${msg}: ${re}`); },
  notMatch(str, re, msg = 'pattern should not appear') { if (re.test(str)) fail(`${msg}: ${re}`); },
};

export const read = p => readFileSync(join(ROOT, p), 'utf8');

/**
 * Evaluate browser source files in a sandbox and hand back the globals they
 * declared. Only safe for modules that declare without touching the DOM at load
 * time; `stubs` fills in whatever the module closes over.
 */
export function loadModules(paths, stubs = {}) {
  const ctx = vm.createContext({
    console, Math, JSON, Date, Object, Array, String, Number, isFinite, parseInt, parseFloat,
    setTimeout, clearTimeout, ...stubs,
  });
  for (const p of paths) {
    vm.runInContext(read(p), ctx, { filename: p });
  }
  return ctx;
}

/** Counts of opening vs closing tags, for structural checks on built HTML. */
export function tagBalance(html, tag) {
  const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  return { open, close };
}
