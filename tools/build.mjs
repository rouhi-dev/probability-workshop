#!/usr/bin/env node
/**
 * Build the Probability Workshop from src/ into two targets:
 *
 *   web       -> docs/      a standalone static site for GitHub Pages
 *   artifact  -> build/artifact/index.html   a single file for claude.ai Artifacts,
 *                which supplies its own <head>/<body> skeleton, so that target
 *                omits the document wrapper and inlines CSS + JS.
 *
 * Zero dependencies on purpose: the site is static, and a build that needs an
 * install step is a build that breaks a year from now.
 *
 * Usage: node tools/build.mjs [--target=web|artifact|both] [--quiet]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKUP, SCRIPTS, STYLES } from './manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const target = (args.find(a => a.startsWith('--target=')) || '--target=both').split('=')[1];
const quiet = args.includes('--quiet');
const log = (...a) => { if (!quiet) console.log(...a); };

const read = p => readFileSync(join(ROOT, p), 'utf8');
const missing = [...MARKUP, ...SCRIPTS, ...STYLES].filter(p => !existsSync(join(ROOT, p)));
if (missing.length) {
  console.error('Build aborted — files listed in the manifest are missing:\n  ' + missing.join('\n  '));
  process.exit(1);
}

const banner = name =>
  `\n/* ==== ${name} ${'='.repeat(Math.max(0, 66 - name.length))} */\n`;

const css = STYLES.map(read).join('\n');
const markup = MARKUP.map(read).join('\n');
const js = SCRIPTS.map(p => banner(p) + read(p)).join('\n');

/* Each module opens with its own "use strict"; keep exactly one, at the top of
   the bundle, so the whole bundle is strict and the rest is not noise. */
const bundle = '"use strict";\n' + js.replace(/^\s*"use strict";\s*$/gm, '');

const stamp = `<!-- built ${new Date().toISOString()} from src/ by tools/build.mjs — edit src/, not this file -->`;

let wrote = [];

if (target === 'web' || target === 'both') {
  const out = join(ROOT, 'docs');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const tpl = read('src/index.template.html');
  if (!tpl.includes('<!--APP-->')) throw new Error('index.template.html lost its <!--APP--> marker');
  const html = tpl.replace('<!--APP-->', stamp + '\n' + markup);

  writeFileSync(join(out, 'index.html'), html);
  writeFileSync(join(out, 'styles.css'), css);
  writeFileSync(join(out, 'app.js'), bundle);
  // GitHub Pages must not run the content through Jekyll (underscore-prefixed
  // paths and Liquid braces would be eaten).
  writeFileSync(join(out, '.nojekyll'), '');
  // Hash routing means every real route is "/" — send strays to the dashboard.
  writeFileSync(join(out, '404.html'),
    '<!doctype html><meta charset="utf-8"><title>کارگاه احتمال</title>' +
    '<meta http-equiv="refresh" content="0; url=./">' +
    '<p style="font-family:system-ui;direction:rtl">در حال انتقال به <a href="./">داشبورد</a>…</p>\n');
  wrote.push(['docs/index.html', html.length], ['docs/styles.css', css.length], ['docs/app.js', bundle.length]);
}

if (target === 'artifact' || target === 'both') {
  const out = join(ROOT, 'build', 'artifact');
  mkdirSync(out, { recursive: true });
  const head = read('src/index.template.html');
  const mj = head.match(/<script>\s*window\.MathJax[\s\S]*?<\/script>/)[0];
  const fonts = head.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/)[0];
  const mjsrc = head.match(/<script id="MathJax-script"[^>]*><\/script>/)[0].replace(' defer', '');
  const single = [
    '<title>کارگاه احتمال و فرآیندهای تصادفی</title>',
    fonts, mj, mjsrc,
    '<style>\n' + css + '\n</style>',
    stamp,
    markup,
    '<script>\n' + bundle + '\n</script>',
  ].join('\n');
  writeFileSync(join(out, 'index.html'), single);
  wrote.push(['build/artifact/index.html', single.length]);
}

log('build ok');
for (const [f, n] of wrote) log(`  ${f.padEnd(30)} ${(n / 1024).toFixed(1)} KiB`);
log(`  sources: ${MARKUP.length} markup, ${SCRIPTS.length} scripts, ${STYLES.length} stylesheet`);
