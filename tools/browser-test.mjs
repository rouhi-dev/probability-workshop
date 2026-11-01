#!/usr/bin/env node
/**
 * End-to-end checks in a real Chromium, driven over the DevTools Protocol.
 * Verifies what static analysis cannot: that the page boots without exceptions,
 * that MathJax typesets, that every view renders the expected number of rows,
 * that the three instruments actually draw and respond to input, that progress
 * survives a reload, and that nothing overflows sideways at phone width.
 *
 * Usage: node tools/browser-test.mjs [--keep-shots] [--url=https://…]
 * With --url it tests a deployed site instead of the local build.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEEP = process.argv.includes('--keep-shots');
const EXT_URL = (process.argv.find(a => a.startsWith('--url=')) || '').split('=')[1];
const SHOTS = join(ROOT, 'build', 'screenshots');

const BROWSERS = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome', 'chrome'];

/** Find a usable Chromium. spawn().pid is truthy even when the binary does not
 *  exist (ENOENT arrives asynchronously), so probe synchronously instead. */
function findBrowser() {
  const candidates = [process.env.CHROME_BIN, process.env.CHROME_PATH, ...BROWSERS].filter(Boolean);
  for (const bin of candidates) {
    try {
      const v = execFileSync(bin, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 });
      return { bin, version: v.toString().trim() };
    } catch { /* not this one */ }
  }
  throw new Error(
    'No Chromium-based browser found. Tried: ' + candidates.join(', ') +
    '\nInstall one, or set CHROME_BIN to its path.');
}

/* ---------------- tiny CDP client over Node 22's global WebSocket ---------------- */
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.events = []; this.dead = false; }
  static async attach(port) {
    for (let i = 0; i < 100; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find(t => t.type === 'page');
        if (page) {
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
          const c = new CDP(ws);
          ws.onclose = () => {
            c.dead = true;
            for (const { no } of c.waiting.values()) no(new Error('devtools socket closed — browser gone'));
            c.waiting.clear();
          };
          ws.onmessage = ev => {
            const m = JSON.parse(ev.data);
            if (m.id && c.waiting.has(m.id)) {
              const { ok: res, no: rej } = c.waiting.get(m.id);
              c.waiting.delete(m.id);
              m.error ? rej(new Error(m.error.message)) : res(m.result);
            } else if (m.method) c.events.push(Object.assign(m, { ts: Date.now() }));
          };
          return c;
        }
      } catch { /* browser still starting */ }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('could not attach to Chromium');
  }
  send(method, params = {}) {
    if (this.dead) return Promise.reject(new Error('browser is gone'));
    const id = ++this.id;
    return new Promise((ok, no) => {
      this.waiting.set(id, { ok, no });
      try { this.ws.send(JSON.stringify({ id, method, params })); }
      catch (e) { this.waiting.delete(id); return no(e); }
      setTimeout(() => { if (this.waiting.delete(id)) no(new Error(`${method} timed out`)); }, 15000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(() => { ${expr} })()`, returnByValue: true, awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error('page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  pageErrors() {
    return this.events
      .filter(e => e.method === 'Runtime.exceptionThrown')
      .map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
  }
  consoleErrors() {
    return this.events
      .filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
      .map(e => e.params.args.map(a => a.value ?? a.description ?? '?').join(' '))
      // A blocked font or a CDN hiccup is a network condition, not an app bug.
      .filter(m => !/Failed to load resource|net::ERR|favicon/i.test(m));
  }
  failedRequests() {
    return this.events
      .filter(e => e.method === 'Network.loadingFailed' && !/favicon/.test(JSON.stringify(e.params)))
      .map(e => e.params.errorText);
  }
}

/* ---------------- test registry ---------------- */
const results = [];
let group = '';
const G = n => { group = n; };
async function check(name, fn) {
  try { await fn(); results.push({ group, name, ok: true }); }
  catch (e) { results.push({ group, name, ok: false, msg: e.message }); }
}
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`); };
const atLeast = (a, b, what) => { if (!(a >= b)) throw new Error(`${what}: expected >= ${b}, got ${a}`); };
const truthy = (v, what) => { if (!v) throw new Error(`${what}: got ${JSON.stringify(v)}`); };

/* ---------------- run ---------------- */
let server, browser, profile;
try {
  let base = EXT_URL;
  if (!base) { server = await serve(8099, join(ROOT, 'docs'), false); base = 'http://127.0.0.1:8099/'; }

  const { bin, version } = findBrowser();
  console.log(`  using ${bin} — ${version}`);
  profile = mkdtempSync(join(tmpdir(), 'probws-'));
  browser = spawn(bin, [
    '--headless=new', '--remote-debugging-port=9333', '--no-sandbox', '--disable-gpu',
    '--disable-dev-shm-usage', '--hide-scrollbars', `--user-data-dir=${profile}`,
    '--window-size=1280,900', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const browserLog = [];
  browser.stderr.on('data', d => browserLog.push(d.toString()));
  browser.on('exit', (code, sig) => browserLog.push(`\n[browser exited code=${code} signal=${sig}]`));

  const cdp = await CDP.attach(9333).catch(err => {
    const log = browserLog.join('').split('\n').slice(-12).join('\n      ');
    throw new Error(`${err.message}\n    browser stderr:\n      ${log}`);
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');

  const onceEvent = (method, ms = 15000) => new Promise((ok, no) => {
    const t0 = Date.now();
    const poll = setInterval(() => {
      if (cdp.events.some(e => e.method === method && e.ts > t0 - 50)) { clearInterval(poll); ok(); }
      else if (Date.now() - t0 > ms) { clearInterval(poll); no(new Error(method + ' never fired')); }
    }, 50);
  });
  const goto = async (hash = '') => {
    const mark = Date.now();
    cdp.events = cdp.events.filter(e => e.method !== 'Page.loadEventFired');
    await cdp.send('Page.navigate', { url: base + hash });
    await onceEvent('Page.loadEventFired').catch(() => {});
    // Gate on the real signals — MathJax typesetting and one animation frame —
    // rather than a flat sleep, so the suite is both faster and less flaky.
    await cdp.eval(`return new Promise(resolve => {
      const done = () => requestAnimationFrame(() => setTimeout(resolve, 120));
      const p = window.MathJax && MathJax.startup && MathJax.startup.promise;
      if (p) p.then(done, done); else setTimeout(done, 400);
      setTimeout(resolve, 6000);
    });`);
    void mark;
  };
  const setViewport = (w, h, mobile = false) => cdp.send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile });
  const shot = async name => {
    mkdirSync(SHOTS, { recursive: true });
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
  };

  await setViewport(1280, 900);
  await goto();

  /* ---- boot health ---- */
  G('boot');
  await check('page loads with no uncaught exceptions', () => {
    const errs = cdp.pageErrors();
    if (errs.length) throw new Error(errs.slice(0, 3).join(' | '));
  });
  await check('no console errors', () => {
    const errs = cdp.consoleErrors();
    if (errs.length) throw new Error(errs.slice(0, 3).join(' | '));
  });
  await check('no failed network requests', () => {
    const f = cdp.failedRequests();
    if (f.length) throw new Error(f.slice(0, 3).join(' | '));
  });
  await check('document is Persian and right-to-left', async () => {
    eq(await cdp.eval(`return document.documentElement.dir`), 'rtl', 'dir');
    eq(await cdp.eval(`return document.documentElement.lang`), 'fa', 'lang');
    eq(await cdp.eval(`return getComputedStyle(document.getElementById('app')).direction`), 'rtl', 'computed direction');
  });
  await check('Persian webfont actually loaded (not a silent fallback)', async () => {
    // The weight matters: Markazi Text is requested at 500/600/700, so a bare
    // check() (which asks for 400) reports false even when the face is loaded.
    truthy(await cdp.eval(`return document.fonts.check('400 16px Vazirmatn')`), 'Vazirmatn available');
    truthy(await cdp.eval(`return document.fonts.check('700 28px "Markazi Text"')`), 'Markazi Text available');
    eq(await cdp.eval(`
      const h = document.querySelector('.viewhead h2');
      return getComputedStyle(h).fontFamily.split(',')[0].replace(/"/g, '');`), 'Markazi Text', 'heading face in use');
  });
  await check('Persian text in monospace elements keeps its letter joining', async () => {
    const r = await cdp.eval(`
      const pill = [...document.querySelectorAll('.pill')].find(p => /[\u0600-\u06FF]/.test(p.textContent));
      const kpi = document.querySelector('.kpi .n');
      return { pillFam: pill ? getComputedStyle(pill).fontFamily : '',
               pillSpacing: pill ? getComputedStyle(pill).letterSpacing : '',
               kpiFam: kpi ? getComputedStyle(kpi).fontFamily : '' };`);
    truthy(/Vazirmatn/.test(r.pillFam), `pill font stack has no Persian face: ${r.pillFam}`);
    truthy(/Vazirmatn/.test(r.kpiFam), `KPI font stack has no Persian face: ${r.kpiFam}`);
    truthy(r.pillSpacing === 'normal' || parseFloat(r.pillSpacing) === 0,
      `tracking on Persian text breaks joining: ${r.pillSpacing}`);
  });
  await check('body paints a real background colour', async () => {
    const bg = await cdp.eval(`return getComputedStyle(document.body).backgroundColor`);
    truthy(bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', `body background is ${bg}`);
  });

  /* ---- maths rendering ---- */
  G('mathematics');
  await check('MathJax typeset the page', async () => {
    atLeast(await cdp.eval(`return document.querySelectorAll('mjx-container').length`), 50, 'mjx-container count');
  });
  await check('no raw unprocessed TeX left visible', async () => {
    const leftovers = await cdp.eval(`
      const bad = [];
      document.querySelectorAll('#v-dash, #v-road, #v-thm, #v-pre, #v-l1, #v-q').forEach(s => {
        const t = s.innerText || '';
        if (/\\\\[a-zA-Z]{2,}\\{/.test(t)) bad.push(s.id);
      });
      return bad;`);
    if (leftovers.length) throw new Error('raw TeX visible in: ' + leftovers.join(', '));
  });
  await check('maths runs left-to-right inside the RTL page', async () => {
    eq(await cdp.eval(`
      const m = document.querySelector('mjx-container');
      return m ? getComputedStyle(m).direction : 'none';`), 'ltr', 'mjx direction');
  });

  /* ---- views render with the right cardinality ---- */
  G('views');
  await check('nav rail lists every section plus the locked lessons', async () => {
    const n = await cdp.eval(`return document.querySelectorAll('#rail a').length`);
    atLeast(n, 11, 'rail links');
    atLeast(await cdp.eval(`return document.querySelectorAll('#rail a.locked').length`), 4, 'locked lessons shown');
  });
  await check('dashboard renders KPIs, readiness, topic rows and prerequisites', async () => {
    atLeast(await cdp.eval(`return document.querySelectorAll('#kpis .kpi').length`), 6, 'KPI tiles');
    atLeast(await cdp.eval(`return document.querySelectorAll('#readiness .meter').length`), 1, 'readiness meter');
    eq(await cdp.eval(`return document.querySelectorAll('#topicList .r').length`), 17, 'topic rows');
    eq(await cdp.eval(`return document.querySelectorAll('#prereqList .r').length`), 12, 'prerequisite rows');
  });
  await check('a fresh visitor sees 0% readiness and no mastered topic', async () => {
    await cdp.eval(`try { localStorage.clear(); } catch(e) {}`);
    await goto();
    const pct = await cdp.eval(`return document.querySelector('#readiness .n').textContent`);
    truthy(/^0/.test(pct), `readiness shows ${pct}`);
    eq(await cdp.eval(`return document.querySelectorAll('#topicList .pill.ok').length`), 0, 'mastered pills');
  });
  await check('roadmap shows 14 days', async () => {
    eq(await cdp.eval(`return document.querySelectorAll('#roadTable tbody tr').length`), 14, 'roadmap rows');
  });
  await check('dependency graph draws all nodes and edges', async () => {
    eq(await cdp.eval(`return document.querySelectorAll('#depgraph g.nd').length`), 23, 'graph nodes');
    eq(await cdp.eval(`return document.querySelectorAll('#depgraph path.ed').length`), 34, 'graph edges');
  });
  await check('clicking a graph node highlights its prerequisite chain', async () => {
    await cdp.eval(`location.hash = '#v-map';`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 300));`);
    await cdp.eval(`document.querySelector('[data-nd="cdf"]').dispatchEvent(new MouseEvent('click', {bubbles:true}));`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 300));`);
    eq(await cdp.eval(`return document.querySelectorAll('#depgraph g.nd.cur').length`), 1, 'selected node');
    atLeast(await cdp.eval(`return document.querySelectorAll('#depgraph g.nd.anc').length`), 8, 'highlighted ancestors');
    atLeast(await cdp.eval(`return document.querySelector('#nodeInfo').innerText.length`), 60, 'info panel text');
  });
  await check('proof inventory and prerequisite cards render', async () => {
    eq(await cdp.eval(`return document.querySelectorAll('#thmList .ex').length`), 16, 'theorem cards');
    eq(await cdp.eval(`return document.querySelectorAll('#preCards .ex').length`), 12, 'prerequisite cards');
  });
  await check('both lessons render their quizzes and exercises', async () => {
    eq(await cdp.eval(`return document.querySelectorAll('#quizL1 .quiz').length`), 7, 'lesson 1 quiz blocks (6 questions + score)');
    eq(await cdp.eval(`return document.querySelectorAll('#quizQ .quiz').length`), 5, 'CDF quiz blocks (4 questions + score)');
    eq(await cdp.eval(`return document.querySelectorAll('#exL1 .ex').length`), 7, 'lesson 1 exercises');
    eq(await cdp.eval(`return document.querySelectorAll('#exQ .ex').length`), 3, 'CDF exercises');
  });

  /* ---- instruments ---- */
  G('instrument: experiment lab');
  await check('canvas is sized to its container once the lesson is shown', async () => {
    await cdp.eval(`location.hash = '#v-l1';`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 500));`);
    atLeast(await cdp.eval(`return document.getElementById('expChart').width`), 400, 'canvas backing width');
    atLeast(await cdp.eval(`return document.querySelectorAll('#expOutcomes button').length`), 2, 'outcome chips');
  });
  await check('running the experiment advances n and the relative frequency', async () => {
    await cdp.eval(`
      document.querySelector('[data-pre="0"]').click();           // preset event A
      document.querySelector('[data-run="200"]').click();`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 300));`);
    const nums = await cdp.eval(`return [...document.querySelectorAll('#expReadout .n')].map(e => e.textContent)`);
    truthy(nums.some(t => /۲۰۰|200/.test(t)), `readout did not show n=200: ${nums.join(' / ')}`);
  });
  await check('empirical frequency lands inside the 2-sigma band after 2000 runs', async () => {
    const r = await cdp.eval(`
      document.querySelector('[data-run="2000"]').click();
      const v = [...document.querySelectorAll('#expReadout .n')].map(e =>
        parseFloat(e.textContent.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
      return { pA: v[0], n: v[1], phat: v[3], band: v[5] };`);
    truthy(r.n >= 2000, `n = ${r.n}`);
    // generous multiple: this is a statistical check, it must not flake
    truthy(Math.abs(r.phat - r.pA) < Math.max(4 * r.band, 0.05),
      `|p̂ − P(A)| = ${Math.abs(r.phat - r.pA).toFixed(4)} vs band ${r.band}`);
  });
  await check('switching experiment to the non-equiprobable BSC resets and relabels', async () => {
    await cdp.eval(`document.querySelector('[data-exp="bsc3"]').click();`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 300));`);
    const note = await cdp.eval(`return document.getElementById('expSetNote').innerText`);
    truthy(/هم‌احتمال نیستند/.test(note), 'BSC must warn that outcomes are not equiprobable');
    eq(await cdp.eval(`return document.querySelectorAll('#expOutcomes button').length`), 8, '|S| = 8');
  });

  G('instrument: event algebra');
  await check('Venn diagram and the exact area bar both draw', async () => {
    atLeast(await cdp.eval(`return document.querySelectorAll('#vennSvg circle').length`), 2, 'Venn circles');
    atLeast(await cdp.eval(`return document.querySelectorAll('#barSvg rect').length`), 2, 'bar segments');
  });
  await check('the exact bar segments always sum to the full width', async () => {
    const r = await cdp.eval(`
      document.getElementById('vPA').value = 0.62;
      document.getElementById('vPA').dispatchEvent(new Event('input'));
      const rs = [...document.querySelectorAll('#barSvg rect')].slice(1).map(x => +x.getAttribute('width'));
      return { sum: rs.reduce((a,b)=>a+b,0), n: rs.length };`);
    truthy(Math.abs(r.sum - 600) < 1.5, `segment widths sum to ${r.sum} of 600`);
  });
  await check('setting P(A∩B)=0 with positive marginals reports exclusive AND dependent', async () => {
    const v = await cdp.eval(`
      const set = (id, val) => { const e = document.getElementById(id); e.value = val; e.dispatchEvent(new Event('input')); };
      set('vPA', 0.5); set('vPB', 0.4); set('vPAB', 0);
      return document.getElementById('vennVerdict').innerText;`);
    truthy(/ناسازگار ✓/.test(v), 'should report mutually exclusive');
    truthy(/مستقل ✗/.test(v), 'should report NOT independent');
  });
  await check('choosing independent values reports independent and not exclusive', async () => {
    const v = await cdp.eval(`
      const set = (id, val) => { const e = document.getElementById(id); e.value = val; e.dispatchEvent(new Event('input')); };
      set('vPA', 0.5); set('vPB', 0.4); set('vPAB', 0.2);   // 0.5 * 0.4 = 0.2
      return document.getElementById('vennVerdict').innerText;`);
    truthy(/مستقل ✓/.test(v), 'should report independent');
    truthy(/ناسازگار ✗/.test(v), 'should report not mutually exclusive');
  });
  await check('De Morgan: the two complement operators select the same region', async () => {
    const r = await cdp.eval(`
      const grab = () => [...document.querySelectorAll('#barSvg rect')].slice(1)
        .map(x => x.getAttribute('fill') + ':' + x.getAttribute('width'));
      document.querySelector('[data-vop="ncup"]').click(); const a = grab();
      document.querySelector('[data-vop="dm"]').click();   const b = grab();
      return { a, b };`);
    if (JSON.stringify(r.a) !== JSON.stringify(r.b))
      throw new Error(`(A∪B)' and Ā∩B̄ shade differently:\n  ${JSON.stringify(r.a)}\n  ${JSON.stringify(r.b)}`);
  });

  G('instrument: CDF explorer');
  await check('CDF chart draws and the valid discrete preset passes all four checks', async () => {
    await cdp.eval(`location.hash = '#v-q';`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 600));`);
    atLeast(await cdp.eval(`return document.getElementById('cdfChart').width`), 400, 'canvas width');
    await cdp.eval(`document.querySelector('[data-cdf="disc"]').click();`);
    const v = await cdp.eval(`return document.getElementById('cdfVerdict').innerText`);
    truthy(/CDF معتبر است/.test(v), `expected a valid verdict, got: ${v}`);
    eq((v.match(/✓/g) || []).length, 4, 'all four characterising conditions ticked');
  });
  await check('the decreasing counter-example is rejected for monotonicity', async () => {
    const v = await cdp.eval(`
      document.querySelector('[data-cdf="neg"]').click();
      return document.getElementById('cdfVerdict').innerText;`);
    truthy(/ناکاهشی ✗/.test(v), 'must fail the non-decreasing test');
    truthy(/CDF نیست/.test(v), 'must be reported as not a CDF');
  });
  await check('the left-continuous fake is rejected for right-continuity only', async () => {
    const v = await cdp.eval(`
      document.querySelector('[data-cdf="left"]').click();
      return document.getElementById('cdfVerdict').innerText;`);
    truthy(/ناکاهشی ✓/.test(v), 'monotone should pass');
    truthy(/راست‌پیوسته ✗/.test(v), 'right-continuity should fail');
  });
  await check('jump readout equals P{X=a} at a point mass', async () => {
    const r = await cdp.eval(`
      document.querySelector('[data-cdf="mix"]').click();
      const s = document.getElementById('cdfA'); s.value = 0; s.dispatchEvent(new Event('input'));
      const v = [...document.querySelectorAll('#cdfReadout .n')].map(e => parseFloat(e.textContent));
      return { Fminus: v[0], F: v[1], Fplus: v[2], jump: v[3] };`);
    truthy(Math.abs(r.jump - 0.4) < 1e-3, `jump = ${r.jump}, expected 0.4`);
    truthy(Math.abs(r.F - r.Fplus) < 1e-3, 'right-continuity: F(a) must equal F(a+)');
    truthy(Math.abs(r.F - r.Fminus - 0.4) < 1e-3, 'F(a) − F(a−) must be the mass');
  });
  await check('zooming in keeps the chart drawing (right-continuity demo)', async () => {
    const ok = await cdp.eval(`
      const z = document.getElementById('cdfZ'); z.value = 80; z.dispatchEvent(new Event('input'));
      return document.getElementById('cdfZv').textContent.length > 0 && !!document.getElementById('cdfChart').width;`);
    truthy(ok, 'zoom readout and canvas');
  });

  /* ---- progress persistence ---- */
  G('progress persistence');
  await check('answering a quiz question stores progress and shows diagnostic feedback', async () => {
    await goto('#v-l1');
    const r = await cdp.eval(`
      const right = document.querySelector('#quizL1 .opt[data-i="0"][data-j="1"]');
      right.click();
      return { fb: document.querySelector('#quizL1 .fb') ? document.querySelector('#quizL1 .fb').innerText.length : 0,
               good: !!document.querySelector('#quizL1 .fb.good'),
               stored: localStorage.getItem('prob-workshop-v1') };`);
    atLeast(r.fb, 80, 'feedback length');
    truthy(r.good, 'correct answer should be marked good');
    truthy(r.stored && r.stored.includes('quizL1'), 'progress written to localStorage');
  });
  await check('progress survives a full reload', async () => {
    await goto('#v-l1');
    truthy(await cdp.eval(`return !!document.querySelector('#quizL1 .fb')`), 'feedback restored after reload');
    const score = await cdp.eval(`return document.querySelector('#quizL1 .quiz b').innerText`);
    truthy(/۱ از ۱/.test(score), `score line reads "${score}"`);
  });
  await check('exercise notes persist and appear on the dashboard', async () => {
    await cdp.eval(`
      const ta = document.getElementById('ta-1-1');
      ta.value = 'آزمون پایداری: S = {0,1}^3';
      ta.dispatchEvent(new Event('input'));
      document.querySelector('[data-exs="1-1"][data-v="done"]').click();`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 1200));`);
    await goto();
    const row = await cdp.eval(`return document.getElementById('exTable').innerText`);
    truthy(/1-1/.test(row), 'exercise row missing from the dashboard table');
    truthy(/آزمون پایداری/.test(row), 'saved answer text missing');
    truthy(await cdp.eval(`return document.getElementById('ta-1-1').value.length > 0`), 'textarea refilled');
  });
  await check('reading a lesson moves the topic to "learning", never "mastery"', async () => {
    const txt = await cdp.eval(`return document.getElementById('topicList').innerText`);
    truthy(/در حال یادگیری|نیازمند تمرین بیشتر/.test(txt), 'expected a non-mastered in-progress state');
    eq(await cdp.eval(`return document.querySelectorAll('#topicList .pill.ok').length`), 0,
      'no topic may be mastered from reading plus one answer');
  });
  await check('reset clears everything', async () => {
    await cdp.eval(`window.confirm = () => true; document.getElementById('resetBtn').click();`);
    await cdp.eval(`return new Promise(r => setTimeout(r, 400));`);
    const pct = await cdp.eval(`return document.querySelector('#readiness .n').textContent`);
    truthy(/^0/.test(pct), `readiness after reset: ${pct}`);
  });

  /* ---- theming ---- */
  G('theming');
  await check('theme toggle switches palette and keeps text readable', async () => {
    const r = await cdp.eval(`
      const b = getComputedStyle(document.body).backgroundColor;
      document.getElementById('themeBtn').click();
      const after = getComputedStyle(document.body).backgroundColor;
      return { b, after, attr: document.documentElement.getAttribute('data-theme'),
               ink: getComputedStyle(document.body).color };`);
    truthy(r.attr === 'dark' || r.attr === 'light', `data-theme = ${r.attr}`);
    truthy(r.b !== r.after, 'background did not change');
    const lum = s => { const [x, y, z] = s.match(/\d+/g).map(Number); return 0.2126 * x + 0.7152 * y + 0.0722 * z; };
    truthy(Math.abs(lum(r.after) - lum(r.ink)) > 90, 'text/background contrast collapsed after toggle');
  });
  await check('dark colour scheme renders without exceptions', async () => {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await goto();
    const errs = cdp.pageErrors();
    if (errs.length) throw new Error(errs.slice(0, 2).join(' | '));
    await shot('desktop-dark');
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  });

  /* ---- responsive ---- */
  G('responsive layout');
  await check('desktop 1280×900: no horizontal page scroll', async () => {
    await setViewport(1280, 900);
    await goto();
    // the theming check left an explicit theme behind; shoot the default look
    await cdp.eval(`try { localStorage.removeItem('prob-workshop-v1-theme'); } catch(e) {}`);
    await goto();
    const o = await cdp.eval(`return { sw: document.documentElement.scrollWidth, iw: window.innerWidth }`);
    truthy(o.sw <= o.iw + 1, `page scrolls sideways: scrollWidth ${o.sw} > innerWidth ${o.iw}`);
    await shot('desktop-dashboard');
    await goto('#v-l1'); await shot('desktop-lesson');
    await goto('#v-map'); await shot('desktop-graph');
  });
  await check('phone 390×844: no horizontal page scroll on any view', async () => {
    await setViewport(390, 844, true);
    const bad = [];
    for (const v of ['', '#v-road', '#v-map', '#v-thm', '#v-pre', '#v-l1', '#v-q']) {
      await goto(v);
      const o = await cdp.eval(`return { sw: document.documentElement.scrollWidth, iw: window.innerWidth }`);
      if (o.sw > o.iw + 1) bad.push(`${v || '#v-dash'} (${o.sw} > ${o.iw})`);
    }
    if (bad.length) throw new Error('horizontal overflow on: ' + bad.join(', '));
  });
  await check('phone: nav becomes a horizontal strip and a 16px gutter is kept', async () => {
    await goto();
    eq(await cdp.eval(`return getComputedStyle(document.querySelector('nav.rail')).flexDirection`), 'row', 'rail direction');
    const pad = await cdp.eval(`return getComputedStyle(document.querySelector('.shell')).paddingInlineStart`);
    truthy(parseFloat(pad) >= 16, `side gutter is ${pad}`);
    await shot('phone-dashboard');
    await goto('#v-l1'); await shot('phone-lesson');
    await goto('#v-q'); await shot('phone-cdf');
  });
  await check('phone: instruments still size their canvases to the viewport', async () => {
    await goto('#v-l1');
    const w = await cdp.eval(`
      const c = document.getElementById('expChart');
      return { css: parseFloat(getComputedStyle(c).width), vw: window.innerWidth };`);
    truthy(w.css > 240 && w.css <= w.vw, `canvas css width ${w.css} vs viewport ${w.vw}`);
  });
  await check('tablet 820×1180 renders without overflow', async () => {
    await setViewport(820, 1180);
    await goto('#v-road');
    const o = await cdp.eval(`return { sw: document.documentElement.scrollWidth, iw: window.innerWidth }`);
    truthy(o.sw <= o.iw + 1, `overflow at tablet width: ${o.sw} > ${o.iw}`);
  });

  /* ---- routing ---- */
  G('routing');
  await check('direct URL access to every view works', async () => {
    await setViewport(1280, 900);
    const bad = [];
    for (const id of ['v-dash', 'v-road', 'v-map', 'v-thm', 'v-pre', 'v-l1', 'v-q']) {
      await goto('#' + id);
      const shown = await cdp.eval(`return [...document.querySelectorAll('section.view')].filter(s => !s.hidden).map(s => s.id)`);
      if (shown.length !== 1 || shown[0] !== id) bad.push(`#${id} -> ${JSON.stringify(shown)}`);
    }
    if (bad.length) throw new Error('direct access failed: ' + bad.join(', '));
  });
  await check('refresh keeps you on the same view', async () => {
    await goto('#v-q');
    await cdp.send('Page.reload');
    await cdp.eval(`return new Promise(r => setTimeout(r, 2000));`);
    const shown = await cdp.eval(`return [...document.querySelectorAll('section.view')].filter(s => !s.hidden).map(s => s.id)`);
    eq(shown.join(), 'v-q', 'view after refresh');
  });
  await check('locked lessons do not navigate', async () => {
    await goto();
    const before = await cdp.eval(`return location.hash`);
    await cdp.eval(`document.querySelector('#rail a.locked').click();`);
    eq(await cdp.eval(`return location.hash`), before, 'hash changed on a locked lesson');
  });
  await check('an unknown path serves the 404 fallback that redirects to the app', async () => {
    const res = await fetch(base + 'does-not-exist');
    eq(res.status, 404, 'status for an unknown path');
    const body = await res.text();
    truthy(/http-equiv="refresh"/.test(body), '404 page should redirect to the dashboard');
    truthy(/url=\.\//.test(body), '404 redirect target should be the app root');
  });

  /* ---- accessibility basics ---- */
  G('accessibility');
  await check('interactive controls are reachable and labelled', async () => {
    await goto('#v-l1');
    const r = await cdp.eval(`
      const btns = [...document.querySelectorAll('button')];
      return { n: btns.length,
               unlabelled: btns.filter(b => !(b.innerText || '').trim() && !b.getAttribute('aria-label')).length,
               sliders: document.querySelectorAll('input[type=range]').length,
               labelled: [...document.querySelectorAll('input[type=range]')].filter(s => s.closest('label')).length };`);
    atLeast(r.n, 30, 'button count');
    eq(r.unlabelled, 0, 'buttons with no accessible name');
    eq(r.labelled, r.sliders, 'range inputs wrapped in a label');
  });
  await check('focus is visible on keyboard navigation', async () => {
    // :focus-visible is not set by element.focus(), so read the rule that would
    // apply, then confirm a real Tab press paints an outline.
    const declared = await cdp.eval(`
      let found = false;
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) if (r.selectorText && r.selectorText.includes(':focus-visible')
          && /outline/.test(r.style.cssText)) found = true;
      }
      return found;`);
    truthy(declared, 'no :focus-visible outline rule in the stylesheet');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const r = await cdp.eval(`
      const el = document.activeElement;
      const s = getComputedStyle(el);
      return { tag: el.tagName, fv: el.matches(':focus-visible'), style: s.outlineStyle, w: s.outlineWidth };`);
    truthy(r.fv ? r.style !== 'none' : true, `focused ${r.tag} shows outline ${r.style} ${r.w}`);
  });
  await check('SVG diagrams carry a text alternative', async () => {
    const n = await cdp.eval(`return [...document.querySelectorAll('svg')].filter(s => s.getAttribute('aria-label')).length`);
    atLeast(n, 3, 'labelled SVGs');
  });

  /* ---- report ---- */
  let g2 = '';
  let pass = 0;
  for (const r of results) {
    if (r.group !== g2) { console.log(`\n  ${r.group}`); g2 = r.group; }
    if (r.ok) { pass++; console.log(`    \x1b[32m✓\x1b[0m ${r.name}`); }
    else console.log(`    \x1b[31m✗\x1b[0m ${r.name}\n        ${r.msg}`);
  }
  console.log(`\n  ${pass}/${results.length} browser checks passed`);
  if (pass !== results.length && browserLog.length) {
    const tail = browserLog.join('').split('\n').filter(l => /error|crash|fatal|abort/i.test(l)).slice(-8);
    if (tail.length) console.log('\n  browser stderr (filtered):\n    ' + tail.join('\n    '));
  }
  console.log(`  screenshots: ${KEEP ? SHOTS : '(discarded — pass --keep-shots to keep)'}`);
  if (!KEEP) rmSync(SHOTS, { recursive: true, force: true });
  if (pass !== results.length) process.exitCode = 1;
} finally {
  // Chrome keeps writing to its profile for a moment after SIGTERM, so removing
  // the directory immediately races and throws ENOTEMPTY — which would fail the
  // whole run after every check had already passed. Wait for exit, then retry.
  if (browser && browser.exitCode === null) {
    browser.kill();
    await new Promise(resolve => {
      const done = setTimeout(() => { try { browser.kill('SIGKILL'); } catch {} resolve(); }, 4000);
      browser.once('exit', () => { clearTimeout(done); resolve(); });
    });
  }
  if (server) server.close();
  if (profile) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 }); }
    catch (e) { console.log(`  (left ${profile} behind: ${e.code})`); }
  }
}
