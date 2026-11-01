/** Checks on the built site: structure, RTL correctness, theming discipline,
 *  content-security constraints, and that no secret ever lands in the output. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { suite, test, assert, read, ROOT, tagBalance } from './_harness.mjs';
import { MARKUP, SCRIPTS } from '../tools/manifest.mjs';

const html = read('docs/index.html');
const css = read('docs/styles.css');
const js = read('docs/app.js');

suite('build output');

test('all expected files are produced', () => {
  for (const f of ['docs/index.html', 'docs/styles.css', 'docs/app.js', 'docs/.nojekyll', 'docs/404.html'])
    assert.ok(existsSync(join(ROOT, f)), `missing ${f}`);
});

test('no build placeholder survives into the output', () => {
  assert.notMatch(html, /<!--APP-->/, 'template marker still present');
  // The build substitutes one HTML comment marker; it is not a brace templating
  // engine, and `}}` occurs legitimately in LaTeX (\bar{B}}, F_{\text{...}}).
  assert.match(html, /built \d{4}-\d{2}-\d{2}T/, 'build stamp missing');
});

test('every manifest source is represented in the bundle', () => {
  assert.empty(SCRIPTS.filter(p => !js.includes(`==== ${p} `)), 'script missing from bundle');
  assert.equal((js.match(/"use strict";/g) || []).length, 1, 'exactly one strict-mode pragma');
});

test('bundled JavaScript parses', async () => {
  // new Function compiles without executing; a syntax error throws here.
  assert.ok(new Function(js) instanceof Function);
});

suite('document structure');

test('HTML tags balance', () => {
  for (const tag of ['div', 'section', 'details', 'table', 'svg', 'nav', 'main', 'header', 'canvas', 'html', 'body', 'head'])
    assert.deep(tagBalance(html, tag), { open: tagBalance(html, tag).close, close: tagBalance(html, tag).close },
      `unbalanced <${tag}>`);
});

test('every view section referenced by the nav exists in the markup', () => {
  const navIds = [...js.matchAll(/id:"(v-[a-z0-9-]+)"/g)].map(m => m[1]);
  assert.ok(navIds.length >= 7, `expected the full nav, found ${navIds.length}`);
  assert.empty(navIds.filter(id => !html.includes(`id="${id}"`)), 'nav points at a missing section');
});

test('exactly one view is visible at rest, and it is the dashboard', () => {
  const sections = [...html.matchAll(/<section class="view" id="(v-[a-z0-9-]+)"( hidden)?>/g)];
  const visible = sections.filter(m => !m[2]).map(m => m[1]);
  assert.deep(visible, ['v-dash'], 'first paint must show the dashboard only');
});

test('all interactive host elements the instruments bind to are present', () => {
  const ids = ['expPicker', 'expOutcomes', 'expPresets', 'expReadout', 'expChart', 'expReset',
    'vennOps', 'vennSvg', 'vennExpr', 'barSvg', 'vennReadout', 'vennVerdict', 'vPA', 'vPB', 'vPAB',
    'cdfPicker', 'cdfChart', 'cdfA', 'cdfZ', 'cdfReadout', 'cdfVerdict', 'cdfWhy',
    'depgraph', 'nodeInfo', 'kpis', 'readiness', 'topicList', 'prereqList', 'exTable',
    'roadTable', 'thmList', 'preCards', 'quizL1', 'quizQ', 'exL1', 'exQ', 'rail', 'themeBtn', 'resetBtn', 'syncBadge'];
  assert.empty(ids.filter(id => !html.includes(`id="${id}"`)), 'instrument target missing from DOM');
});

suite('Persian / RTL correctness');

test('document declares Persian and right-to-left', () => {
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /<meta charset="utf-8">/);
});

test('viewport is mobile-ready with safe-area support', () => {
  assert.match(html, /width=device-width/);
  assert.match(html, /viewport-fit=cover/);
});

test('Persian webfonts are requested and have a real fallback stack', () => {
  assert.match(html, /family=Markazi\+Text/, 'display face');
  assert.match(html, /family=Vazirmatn/, 'body face');
  assert.match(css, /--body:"Vazirmatn",system-ui/, 'body fallback');
  assert.match(css, /--display:"Markazi Text","Vazirmatn",serif/, 'display fallback');
});

test('the monospace stack can render Persian, preserving letter joining', () => {
  // IBM Plex Mono carries no Arabic glyphs. Without a Persian fallback in the
  // stack, every Persian label styled as "data" (pills, KPI units, tags) breaks
  // into disconnected letters.
  assert.match(css, /--mono:"IBM Plex Mono",ui-monospace,"Vazirmatn",monospace/);
});

test('no letter-spacing on elements that carry Persian text', () => {
  // Arabic-script joining is destroyed by tracking.
  for (const sel of ['.step', '.pill', '.kpi .n'])
    assert.notMatch(css.slice(css.indexOf(sel)), /^[^}]*letter-spacing:\.\d/,
      `${sel} must not apply letter-spacing to Persian text`);
});

test('maths renders left-to-right inside the RTL page', () => {
  assert.match(css, /mjx-container\{direction:ltr!important\}/);
  assert.match(css, /\.en\{direction:ltr;unicode-bidi:isolate/, 'English terms are bidi-isolated');
});

test('layout uses logical properties so RTL mirrors correctly', () => {
  assert.notMatch(css, /padding-left:|padding-right:|margin-left:|margin-right:/,
    'physical side spacing would not mirror in RTL — use *-inline-*');
  assert.match(css, /padding-inline/);
});

test('a side gutter is kept and the page never scrolls sideways', () => {
  assert.match(css, /\.shell\{max-width:1180px;margin:0 auto;padding-inline:16px/);
  assert.match(css, /\.scrollx\{overflow-x:auto/, 'wide tables scroll inside their own container');
});

test('a phone breakpoint collapses the rail to a scrolling strip', () => {
  assert.match(css, /@media \(max-width:860px\)/);
  // minmax(0,1fr), never a bare 1fr: `1fr` means minmax(auto,1fr), and that auto
  // floor is the nav rail's min-content width (a long row of chips), which pushed
  // the whole grid past the viewport and made the page scroll sideways.
  assert.match(css, /\.layout\{grid-template-columns:minmax\(0,1fr\)/);
  assert.notMatch(css, /grid-template-columns:1fr[;}]/, 'bare 1fr re-introduces the overflow bug');
});

test('a visible keyboard focus state is declared', () => {
  assert.match(css, /:focus-visible\{outline:2px solid var\(--ring\)/);
});

suite('theming discipline');

test('every colour token is declared on bare :root before any override', () => {
  const bare = css.slice(css.indexOf(':root{'), css.indexOf('@media (prefers-color-scheme:dark)'));
  const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
  const declared = new Set([...bare.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  assert.empty([...used].filter(v => !declared.has(v)), 'token used but never declared on bare :root');
});

test('dark mode is defined for both the system default and the explicit toggle', () => {
  assert.match(css, /@media \(prefers-color-scheme:dark\)\{ :root:not\(\[data-theme="light"\]\)/);
  assert.match(css, /:root\[data-theme="dark"\]\{/);
});

test('both dark blocks define the same token set as the light palette', () => {
  const block = re => {
    const m = css.match(re);
    return new Set([...m[0].matchAll(/(--[a-z0-9-]+)\s*:/g)].map(x => x[1]));
  };
  const light = block(/:root\{[\s\S]*?\n\}/);
  const sysDark = block(/@media \(prefers-color-scheme:dark\)\{ :root:not\(\[data-theme="light"\]\)\{[\s\S]*?\n\}\}/);
  const explicit = block(/:root\[data-theme="dark"\]\{[\s\S]*?\n\}/);
  const fonts = new Set(['--mono', '--body', '--display']);   // faces do not change with theme
  const colours = [...light].filter(t => !fonts.has(t));
  assert.empty(colours.filter(t => !sysDark.has(t)), 'token missing from the system dark block');
  assert.empty(colours.filter(t => !explicit.has(t)), 'token missing from the explicit dark block');
});

test('body paints an explicit background from a token', () => {
  assert.match(css, /body\{background:var\(--bg\)/);
});

test('reduced-motion is respected', () => {
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});

suite('security & privacy of the published output');

test('no credentials, tokens or private data in the build', () => {
  const patterns = [
    [/sk-[A-Za-z0-9]{16,}/, 'API-key-like string'],
    [/gh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
    [/AKIA[0-9A-Z]{16}/, 'AWS key id'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
    [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, 'email address'],
    [/(api[_-]?key|secret|password|passwd|bearer)\s*[:=]\s*["'][^"']{8,}/i, 'inline secret'],
  ];
  const found = [];
  for (const body of [html, css, js])
    for (const [re, label] of patterns) if (re.test(body)) found.push(`${label}: ${body.match(re)[0].slice(0, 24)}`);
  assert.empty(found);
});

test('external resources stay on the declared CDN and font hosts', () => {
  const hosts = new Set([...html.matchAll(/https?:\/\/([^/"')\s]+)/g)].map(m => m[1]));
  const allowed = new Set(['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.w3.org']);
  assert.empty([...hosts].filter(h => !allowed.has(h)), 'unexpected external host');
});

test('no network calls of its own — the site is fully static', () => {
  assert.notMatch(js, /\bfetch\s*\(|XMLHttpRequest|new WebSocket|navigator\.sendBeacon/,
    'static site must not call out');
});

test('no analytics or third-party tracking', () => {
  assert.notMatch(html + js, /googletagmanager|google-analytics|gtag\(|plausible|mixpanel|hotjar/i);
});

suite('progress persistence');

test('localStorage is the baseline and every access is guarded', () => {
  assert.match(js, /localStorage\.setItem\(LSKEY/, 'writes progress locally');
  assert.match(js, /localStorage\.getItem\(LSKEY/, 'reads it back');
  const risky = [...js.matchAll(/localStorage\.\w+\([^)]*\)/g)].map(m => m.index);
  const guarded = risky.every(i => {
    const before = js.slice(Math.max(0, i - 200), i);
    return /try\s*\{/.test(before);
  });
  assert.ok(guarded, 'a localStorage access sits outside try/catch');
});

test('optional cloud sync degrades silently when the host is absent', () => {
  assert.match(js, /window\.claude && typeof window\.claude\.use==="function"/, 'feature-detects the host');
  assert.match(js, /data\/users\/"\+uid\+"\/progress/, 'per-viewer private path');
  assert.match(js, /\.catch\(function\(\)\{\}\)/, 'failures are non-fatal');
});

test('markup files are all wired into the page', () => {
  assert.empty(MARKUP.filter(p => {
    const first = read(p).split('\n').find(l => l.trim().startsWith('<'));
    return first && !html.includes(first.trim().slice(0, 40));
  }), 'markup partial missing from the built page');
});
