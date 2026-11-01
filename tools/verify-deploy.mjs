#!/usr/bin/env node
/**
 * Verify a deployed site over the network before claiming it works.
 * Checks transport, headers, that every referenced asset really resolves, that
 * the Persian/RTL markers survived deployment, and that unknown paths fall back.
 *
 * Usage: node tools/verify-deploy.mjs https://user.github.io/repo/
 */
const base = (process.argv[2] || '').replace(/\/?$/, '/');
if (!base) { console.error('usage: node tools/verify-deploy.mjs <url>'); process.exit(2); }

const results = [];
const check = async (name, fn) => {
  try { const info = await fn(); results.push({ name, ok: true, info }); }
  catch (e) { results.push({ name, ok: false, info: e.message }); }
};
const must = (c, m) => { if (!c) throw new Error(m); };

const get = async (path = '', init) => {
  const res = await fetch(new URL(path, base), { redirect: 'follow', ...init });
  return { res, body: await res.text() };
};

await check('served over HTTPS', async () => {
  must(new URL(base).protocol === 'https:', `protocol is ${new URL(base).protocol}`);
  return new URL(base).origin;
});

let html = '';
await check('root returns 200 HTML', async () => {
  const { res, body } = await get();
  must(res.status === 200, `status ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  must(/text\/html/.test(ct), `content-type ${ct}`);
  must(/utf-8/i.test(ct) || /<meta charset="utf-8">/i.test(body), 'no UTF-8 declaration');
  html = body;
  return `${(body.length / 1024).toFixed(0)} KiB, ${ct}`;
});

await check('page declares Persian and RTL', async () => {
  must(/<html lang="fa" dir="rtl">/.test(html), 'missing lang/dir on <html>');
  must(/viewport-fit=cover/.test(html), 'missing safe-area viewport');
  must(/کارگاه احتمال/.test(html), 'Persian title did not survive encoding');
  return 'lang=fa dir=rtl, Persian text intact';
});

await check('every local asset referenced by the page resolves', async () => {
  const refs = [...html.matchAll(/(?:href|src)="(?!https?:|data:|#)([^"]+)"/g)].map(m => m[1]);
  must(refs.length >= 2, `found only ${refs.length} local refs`);
  const bad = [];
  for (const r of [...new Set(refs)]) {
    const res = await fetch(new URL(r, base));
    if (!res.ok) bad.push(`${r} -> ${res.status}`);
  }
  must(bad.length === 0, bad.join(', '));
  return [...new Set(refs)].join(', ');
});

await check('stylesheet and bundle are non-empty and correctly typed', async () => {
  const css = await get('styles.css');
  const js = await get('app.js');
  must(css.res.ok && /text\/css/.test(css.res.headers.get('content-type') || ''), 'styles.css type/status');
  must(js.res.ok && /javascript/.test(js.res.headers.get('content-type') || ''), 'app.js type/status');
  must(css.body.includes('--cont:'), 'design tokens missing from deployed CSS');
  must(js.body.includes('renderAll'), 'app bundle looks truncated');
  return `styles.css ${(css.body.length / 1024).toFixed(0)} KiB, app.js ${(js.body.length / 1024).toFixed(0)} KiB`;
});

await check('MathJax and webfonts are requested from allowed hosts', async () => {
  const hosts = [...new Set([...html.matchAll(/https:\/\/([^/"']+)/g)].map(m => m[1]))];
  const allowed = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.w3.org'];
  const bad = hosts.filter(h => !allowed.includes(h));
  must(bad.length === 0, `unexpected hosts: ${bad.join(', ')}`);
  const mj = await fetch('https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js', { method: 'HEAD' });
  must(mj.ok, `MathJax CDN returned ${mj.status}`);
  return hosts.join(', ');
});

await check('deep links to every view are served by the same document', async () => {
  // Hash routing: the server never sees the fragment, so each deep link must
  // return the app shell itself.
  for (const v of ['#v-dash', '#v-road', '#v-map', '#v-thm', '#v-pre', '#v-l1', '#v-q']) {
    const { res } = await get(v);
    must(res.status === 200, `${v} -> ${res.status}`);
  }
  return '7 views';
});

await check('unknown path falls back to the app', async () => {
  const res = await fetch(new URL('no-such-page', base), { redirect: 'manual' });
  const body = await res.text();
  must(res.status === 404 || res.status === 200, `status ${res.status}`);
  must(/http-equiv="refresh"/.test(body) || /کارگاه احتمال/.test(body), 'no fallback page');
  return `status ${res.status}, redirects to app`;
});

await check('no secrets in the deployed payload', async () => {
  const js = (await get('app.js')).body;
  const pats = [/gh[pousr]_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{16,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/];
  for (const p of pats) must(!p.test(html) && !p.test(js), `matched ${p}`);
  return 'clean';
});

let pass = 0;
for (const r of results) {
  if (r.ok) pass++;
  console.log(`  ${r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${r.name}\n      ${r.info}`);
}
console.log(`\n  ${pass}/${results.length} deployment checks passed for ${base}`);
if (pass !== results.length) process.exitCode = 1;
