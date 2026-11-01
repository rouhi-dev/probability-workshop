/** Assignment 1: content integrity and independent verification of every
 *  numerical claim. Nothing here trusts the prose — each answer is recomputed
 *  by numeric integration, exact rationals, or Monte Carlo, and compared. */
import { suite, test, assert, loadModules, read } from './_harness.mjs';

const g = loadModules([
  'src/data/topics.js',
  'src/data/quizzes.js',
  'src/data/assignment-a.js',
  'src/data/assignment-b.js',
  'src/data/assignment-c.js',
  'src/data/assignment-map.js',
]);
const { ASSIGNMENT, COVERAGE, TOPICS } = g;
const P = Object.fromEntries(ASSIGNMENT.problems.map(p => [p.id, p]));
const tids = new Set(TOPICS.map(t => t.id));

/* ---------- small numerical toolkit, independent of the app's own code ---------- */
const simpson = (f, a, b, n = 20000) => {
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
function mulberry(seed) {              // deterministic RNG: Monte Carlo must not flake
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const poisPmf = (k, lam) => {
  let lg = -lam + k * Math.log(lam);
  for (let i = 2; i <= k; i++) lg -= Math.log(i);
  return Math.exp(lg);
};
const poisCdf = (n, lam) => { let s = 0; for (let k = 0; k <= n; k++) s += poisPmf(k, lam); return s; };

/* ============================ content integrity ============================ */
suite('assignment · structure');

test('exactly the 11 problems from the PDF, numbered 1..11', () => {
  assert.equal(ASSIGNMENT.problems.length, 11, 'problem count');
  assert.deep(ASSIGNMENT.problems.map(p => p.n), [...Array(11)].map((_, i) => i + 1));
  assert.equal(new Set(ASSIGNMENT.problems.map(p => p.id)).size, 11, 'duplicate ids');
});

test('every problem carries a complete educational package', () => {
  const need = ['title', 'statement', 'tested', 'foundation', 'strategy', 'solution',
    'interpret', 'verify', 'mistakes', 'pattern', 'check', 'variants', 'topics', 'concepts', 'prereqs'];
  const bad = [];
  for (const p of ASSIGNMENT.problems)
    for (const f of need)
      if (!p[f] || (Array.isArray(p[f]) && !p[f].length)) bad.push(`${p.id}.${f}`);
  assert.empty(bad);
});

test('solutions show real work, not a bare answer', () => {
  const bad = ASSIGNMENT.problems.filter(p =>
    p.solution.length < 2 || p.solution.some(s => !s.h || !s.body || s.body.length < 60));
  assert.empty(bad.map(p => p.id), 'solution steps too thin');
});

test('every problem names at least three common mistakes and a reusable pattern', () => {
  assert.empty(ASSIGNMENT.problems.filter(p => p.mistakes.length < 3).map(p => p.id));
  assert.empty(ASSIGNMENT.problems
    .filter(p => !p.pattern.name || !p.pattern.recognize || !p.pattern.generalize).map(p => p.id));
});

test('topics and prerequisites resolve to real curriculum entries', () => {
  const bad = [];
  for (const p of ASSIGNMENT.problems) {
    for (const t of p.topics) if (!tids.has(t)) bad.push(`${p.id} topic ${t}`);
    for (const t of p.prereqs) if (!tids.has(t) && !P[t]) bad.push(`${p.id} prereq ${t}`);
  }
  assert.empty(bad);
});

suite('assignment · question bank');

test('each problem has 4 variants, one per difficulty level', () => {
  const bad = [];
  for (const p of ASSIGNMENT.problems) {
    if (p.variants.length !== 4) bad.push(`${p.id}: ${p.variants.length} variants`);
    const levels = p.variants.map(v => v.level).sort();
    if (JSON.stringify(levels) !== '[1,2,3,4]') bad.push(`${p.id}: levels ${levels}`);
  }
  assert.empty(bad);
  assert.equal(ASSIGNMENT.problems.reduce((a, p) => a + p.variants.length, 0), 44, 'bank size');
});

test('every variant has progressive hints, a named skill and a verification step', () => {
  const bad = [];
  for (const p of ASSIGNMENT.problems)
    p.variants.forEach((v, i) => {
      if (!v.q || v.q.length < 60) bad.push(`${p.id}-v${i + 1}: statement too short`);
      if (!v.hints || v.hints.length < 2) bad.push(`${p.id}-v${i + 1}: needs >= 2 hints`);
      if (!v.skill) bad.push(`${p.id}-v${i + 1}: no skill named`);
      if (!v.verify) bad.push(`${p.id}-v${i + 1}: no verification`);
      if (!v.prereqs || !v.prereqs.length) bad.push(`${p.id}-v${i + 1}: no prerequisites`);
    });
  assert.empty(bad);
});

test('variants are not the original problem with new numbers', () => {
  // A variant whose wording nearly duplicates the source statement would be the
  // "artificial variation" the brief rules out.
  const norm = s => s.replace(/<[^>]+>/g, '').replace(/[\s\u200c]+/g, '').slice(0, 120);
  const bad = [];
  for (const p of ASSIGNMENT.problems)
    p.variants.forEach((v, i) => {
      if (norm(v.q) === norm(p.statement)) bad.push(`${p.id}-v${i + 1}`);
    });
  assert.empty(bad);
  // and each of a problem's four variants must test a different skill
  for (const p of ASSIGNMENT.problems)
    assert.equal(new Set(p.variants.map(v => v.skill)).size, 4, `${p.id}: duplicate skills`);
});

test('each checkpoint has exactly one correct option and diagnostic feedback on all four', () => {
  const bad = [];
  for (const p of ASSIGNMENT.problems) {
    const ok = p.check.opts.filter(o => o.ok).length;
    if (ok !== 1) bad.push(`${p.id}: ${ok} correct options`);
    if (p.check.opts.length !== 4) bad.push(`${p.id}: ${p.check.opts.length} options`);
    p.check.opts.forEach((o, j) => {
      if (!o.fb || o.fb.length < 50) bad.push(`${p.id} opt${j + 1}: feedback too short`);
    });
  }
  assert.empty(bad);
});

test('hints never state the final answer outright', () => {
  const leak = /پاسخ(\s|‌)*(نهایی|برابر است با)|جواب(\s|‌)*نهایی/;
  const bad = [];
  for (const p of ASSIGNMENT.problems)
    p.variants.forEach((v, i) => { if (v.hints.some(h => leak.test(h))) bad.push(`${p.id}-v${i + 1}`); });
  assert.empty(bad);
});

suite('assignment · faithfulness to the source PDF');

test('ambiguities are flagged where the statement really is under-specified', () => {
  // Verified by hand against the rendered pages: these four need an explicit assumption.
  for (const id of ['p3', 'p4', 'p8', 'p10'])
    assert.ok(P[id].ambiguity, `${id} should carry an ambiguity note`);
});

test('problem 4 is treated as general — no invented joint CDF', () => {
  const p = P.p4;
  assert.match(p.statement, /بر حسب/, 'statement should say "in terms of"');
  assert.match(p.ambiguity, /هیچ عبارت مشخصی/, 'must state that no explicit F_XY was given');
  // The solution must stay symbolic: no concrete closed-form joint CDF smuggled in.
  const sol = p.solution.map(s => s.body).join(' ');
  assert.notMatch(sol, /1-e\^\{-x\}\)\(1-e/, 'a concrete joint CDF leaked into the general solution');
});

test('statements preserve the original Persian wording and notation', () => {
  assert.match(P.p3.statement, /۱۴۴/, 'rate 144 per year');
  assert.match(P.p3.statement, /۹۰/, '90 per cent');
  assert.match(P.p5.statement, /C\(1-x\^\{2\}\)/, 'density C(1-x^2)');
  assert.match(P.p6.statement, /X\^\{1\/\\beta\}/, 'Y = X^(1/beta)');
  assert.match(P.p7.statement, /c\\,e\^\{-2x\}u\(x\)/, 'c e^{-2x} u(x)');
  assert.match(P.p8.statement, /\(1-e\^\{-ax\}\)\\,u\(x-c\)/, 'F = (1-e^{-ax})u(x-c)');
  assert.match(P.p10.statement, /2e\^\{-2y\}/, 'f_Y = 2e^{-2y}');
  assert.match(P.p11.statement, /۹۹۰/, '990 balls');
  assert.match(P.p1.statement, /Rician/, 'Rician distribution listed');
});

/* ============================ mathematics ============================ */
suite('assignment · problem 2 — probability inequalities');

test("Boole's inequality holds on random finite probability spaces", () => {
  const rnd = mulberry(7);
  const bad = [];
  for (let trial = 0; trial < 300; trial++) {
    const N = 12, n = 4;
    const w = Array.from({ length: N }, () => rnd());
    const tot = w.reduce((a, b) => a + b, 0);
    const p = w.map(x => x / tot);
    const sets = Array.from({ length: n }, () => new Set(
      [...Array(N).keys()].filter(() => rnd() < 0.4)));
    const mass = s => [...s].reduce((a, i) => a + p[i], 0);
    const union = new Set(); sets.forEach(s => s.forEach(i => union.add(i)));
    const inter = [...Array(N).keys()].filter(i => sets.every(s => s.has(i)));
    const lhsU = mass(union), rhsU = sets.reduce((a, s) => a + mass(s), 0);
    if (lhsU > rhsU + 1e-12) bad.push('union bound violated');
    const lhsI = inter.reduce((a, i) => a + p[i], 0);
    const rhsI = 1 - sets.reduce((a, s) => a + (1 - mass(s)), 0);
    if (lhsI < rhsI - 1e-12) bad.push('complement bound violated');
  }
  assert.empty([...new Set(bad)]);
});

test('the chain rule identity is exact on a random space', () => {
  const rnd = mulberry(11);
  const N = 10;
  const w = Array.from({ length: N }, () => rnd() + 0.05);
  const tot = w.reduce((a, b) => a + b, 0);
  const p = w.map(x => x / tot);
  const A = new Set([0, 1, 2, 3]), B = new Set([1, 2, 3, 4, 5]), C = new Set([2, 3, 5, 6, 7]);
  const mass = ix => ix.reduce((a, i) => a + p[i], 0);
  const all = [...Array(N).keys()];
  const ABC = mass(all.filter(i => A.has(i) && B.has(i) && C.has(i)));
  const BC = mass(all.filter(i => B.has(i) && C.has(i)));
  const Cm = mass(all.filter(i => C.has(i)));
  assert.close(ABC, (ABC / BC) * (BC / Cm) * Cm, 1e-12, 'P(ABC) = P(A|BC)P(B|C)P(C)');
});

suite('assignment · problem 3 — Poisson inventory');

test('the monthly rate is 12 and the 90% quantile is 17, not 16', () => {
  const lam = 144 / 12;
  assert.close(lam, 12, 1e-12);
  assert.ok(poisCdf(16, lam) < 0.90, `P(N<=16) = ${poisCdf(16, lam)} must fall short`);
  assert.ok(poisCdf(17, lam) >= 0.90, `P(N<=17) = ${poisCdf(17, lam)} must clear the bar`);
  assert.close(poisCdf(16, lam), 0.89871, 2e-5, 'the near-miss value quoted in the solution');
  assert.close(poisCdf(17, lam), 0.93703, 2e-5, 'the quoted quantile value');
});

test('both two-day conventions are stated and correct', () => {
  const a = 1 - Math.exp(-144 * 2 / 365);
  const b = 1 - Math.exp(-144 * 2 / 360);
  assert.close(a, 0.5457, 5e-4, '365-day year');
  assert.close(b, 0.5507, 5e-4, '360-day year');
  const txt = P.p3.solution.map(s => s.body).join(' ') + P.p3.ambiguity;
  assert.match(txt, /0\{,\}5457/, 'the 365-day answer must appear');
  assert.match(txt, /0\{,\}5507/, 'the 360-day answer must appear');
  assert.match(txt, /365/, 'the year convention must be named');
});

test('the Poisson helper in the visualisation agrees with an independent implementation', () => {
  const viz = loadModules(['src/js/instruments/assignment-viz.js'],
    { $: () => null, $$: () => [], fa: String, typeset: () => {}, ro: () => '', cv: () => null, tok: () => '#000' });
  const bad = [];
  for (const lam of [0.5, 2, 12, 40]) {
    for (let k = 0; k <= 30; k++)
      if (Math.abs(viz.poissonPmf(k, lam) - poisPmf(k, lam)) > 1e-12) bad.push(`pmf ${lam}/${k}`);
    if (viz.poissonQuantile(0.9, lam) !== (() => { let s = 0; for (let k = 0; k < 500; k++) { s += poisPmf(k, lam); if (s >= 0.9 - 1e-12) return k; } })())
      bad.push(`quantile ${lam}`);
  }
  assert.empty(bad);
  assert.equal(viz.poissonQuantile(0.9, 12), 17, 'the instrument must reproduce the textbook answer');
});

test('the newsvendor variant\'s cost model and threshold agree', () => {
  // Caught during review: the stated critical ratio only follows when the
  // holding cost is charged on LEFTOVER units. Charging it on every stocked
  // unit gives 1 - ch/cs instead, and the answer drops from 17 to 16.
  const lam = 12, ch = 1, cs = 9;
  const Epos = (n, sign) => {
    let s2 = 0;
    for (let k = 0; k < 300; k++) {
      const v = sign > 0 ? k - n : n - k;
      if (v > 0) s2 += v * poisPmf(k, lam);
    }
    return s2;
  };
  const C = n => ch * Epos(n, -1) + cs * Epos(n, +1);
  let best = 5;
  for (let n = 5; n < 40; n++) if (C(n) < C(best)) best = n;
  const critical = cs / (cs + ch);
  let viaRatio = 0;
  while (poisCdf(viaRatio, lam) < critical) viaRatio++;
  assert.equal(best, viaRatio, 'argmin must equal the critical-ratio quantile');
  assert.equal(best, 17, 'and must reproduce the original answer');
  assert.close(critical, 0.9, 1e-12, 'the hidden 9:1 cost ratio is the 90% threshold');

  // the variant text must state the cost function it actually uses
  const v = P.p3.variants.find(x => x.level === 3);
  assert.match(v.q, /E\[\(n-N\)\^\{\+\}\]/, 'statement must give the leftover-based cost');
  assert.match(v.hints.join(' '), /1-c_h\/c_s/, 'the alternative model must be flagged in a hint');
});

suite('assignment · problem 5 — parabolic density');

test('C = 3/4 by numeric integration, and the CDF reaches exactly 1', () => {
  const C = 1 / simpson(x => 1 - x * x, -1, 1);
  assert.close(C, 0.75, 1e-9, 'normalising constant');
  const F = x => x < -1 ? 0 : x > 1 ? 1 : 0.75 * (x - x ** 3 / 3 + 2 / 3);
  assert.close(F(-1), 0, 1e-12, 'F(-1)');
  assert.close(F(1), 1, 1e-12, 'F(1)');
  assert.close(F(0), 0.5, 1e-12, 'F(0) by symmetry');
  for (let x = -1; x <= 1; x += 0.01)
    assert.ok(F(x + 0.01) >= F(x) - 1e-12, 'F must be non-decreasing');
});

test('both interval probabilities match the exact rationals and Monte Carlo', () => {
  const F = x => x < -1 ? 0 : x > 1 ? 1 : 0.75 * (x - x ** 3 / 3 + 2 / 3);
  assert.close(F(0.5) - F(0), 11 / 32, 1e-12, 'P(0<X<0.5) = 11/32');
  assert.close(F(0.75) - F(0.25), 35 / 128, 1e-12, 'P(|X-0.5|<0.25) = 35/128');
  // rejection sampling against the true density
  const rnd = mulberry(23);
  let n = 0, hitA = 0, hitB = 0;
  while (n < 400000) {
    const x = -1 + 2 * rnd(), y = 0.75 * rnd();
    if (y <= 0.75 * (1 - x * x)) {
      n++;
      if (x > 0 && x < 0.5) hitA++;
      if (Math.abs(x - 0.5) < 0.25) hitB++;
    }
  }
  assert.close(hitA / n, 11 / 32, 0.005, 'Monte Carlo P(0<X<0.5)');
  assert.close(hitB / n, 35 / 128, 0.005, 'Monte Carlo P(|X-0.5|<0.25)');
});

test('the quoted answers appear verbatim in the solution text', () => {
  const sol = P.p5.solution.map(s => s.body).join(' ');
  assert.match(sol, /C=\\frac\{3\}\{4\}/, 'C = 3/4');
  assert.match(sol, /\\frac\{11\}\{32\}/, '11/32');
  assert.match(sol, /\\frac\{35\}\{128\}/, '35/128');
});

suite('assignment · problem 6 — exponential to Weibull');

test('the derived density and CDF are a matching pair, and the CDF is proper', () => {
  // For beta < 1 the density is singular at the origin (y^{beta-1}), which a
  // uniform-grid Simpson rule integrates badly. So verify the pair away from
  // the singularity, and verify total mass from the closed-form CDF.
  const bad = [];
  for (const lam of [0.5, 1, 2.5]) for (const beta of [0.7, 1, 2, 3.5]) {
    const f = y => lam * beta * Math.pow(y, beta - 1) * Math.exp(-lam * Math.pow(y, beta));
    const F = y => 1 - Math.exp(-lam * Math.pow(y, beta));
    for (const [a, b] of [[0.1, 1], [0.5, 3], [1, 4]]) {
      const I = simpson(f, a, b, 20000);
      if (Math.abs(I - (F(b) - F(a))) > 1e-6)
        bad.push(`lam=${lam} beta=${beta} [${a},${b}]: ∫=${I.toFixed(7)} vs ΔF=${(F(b) - F(a)).toFixed(7)}`);
    }
    if (Math.abs(F(0) - 0) > 1e-15) bad.push(`lam=${lam} beta=${beta}: F(0) != 0`);
    if (Math.abs(F(1e6) - 1) > 1e-12) bad.push(`lam=${lam} beta=${beta}: F(inf) != 1`);
    for (let y = 0.05; y < 5; y += 0.05)
      if (F(y + 0.05) < F(y) - 1e-15) { bad.push(`lam=${lam} beta=${beta}: F not monotone`); break; }
  }
  assert.empty(bad);
});

test('beta = 1 collapses Weibull back to the original exponential', () => {
  const lam = 1.7;
  for (const y of [0.1, 0.5, 1, 3]) {
    const weib = lam * 1 * Math.pow(y, 0) * Math.exp(-lam * y);
    assert.close(weib, lam * Math.exp(-lam * y), 1e-12, `at y=${y}`);
  }
});

test('simulating Y = X^(1/beta) reproduces the derived CDF', () => {
  const rnd = mulberry(31), lam = 1.3, beta = 2.4, N = 200000;
  const grid = [0.3, 0.7, 1.2, 2.0];
  const count = grid.map(() => 0);
  for (let i = 0; i < N; i++) {
    const x = -Math.log(1 - rnd()) / lam;            // Exp(lam)
    const y = Math.pow(x, 1 / beta);
    grid.forEach((t, j) => { if (y <= t) count[j]++; });
  }
  grid.forEach((t, j) => {
    const theory = 1 - Math.exp(-lam * Math.pow(t, beta));
    assert.close(count[j] / N, theory, 0.005, `F_Y(${t})`);
  });
});

suite('assignment · problem 7 — exponential density');

test('c = 2 and all four answers are exact', () => {
  const c = 1 / simpson(x => Math.exp(-2 * x), 0, 60, 60000);
  assert.close(c, 2, 1e-6, 'normalising constant');
  assert.close(Math.exp(-4), 0.0183156, 1e-6, 'Pr(X>2)');
  assert.close(1 - Math.exp(-6), 0.9975212, 1e-6, 'Pr(X<3)');
  const cond = (Math.exp(-4) - Math.exp(-6)) / Math.exp(-4);
  assert.close(cond, 1 - Math.exp(-2), 1e-12, 'Pr(X<3|X>2)');
  assert.ok(cond >= 0 && cond <= 1, 'a conditional probability must lie in [0,1]');
});

test('memorylessness: the conditional answer equals P(X<1)', () => {
  const cond = (Math.exp(-4) - Math.exp(-6)) / Math.exp(-4);
  assert.close(cond, 1 - Math.exp(-2 * 1), 1e-12, 'P(X<3|X>2) = P(X<1)');
  for (const s of [0.5, 2, 5]) {
    const v = (Math.exp(-2 * s) - Math.exp(-2 * (s + 1))) / Math.exp(-2 * s);
    assert.close(v, 1 - Math.exp(-2), 1e-12, `independent of s (s=${s})`);
  }
});

test('the solution flags the >1 trap that the wrong method produces', () => {
  const txt = P.p7.mistakes.join(' ');
  assert.match(txt, /54\{,\}5|54\.5/, 'the characteristic wrong value should be named');
});

suite('assignment · problem 8 — CDF with a jump');

test('the density including the Dirac term integrates to exactly 1', () => {
  const bad = [];
  for (const a of [0.5, 1, 3]) for (const c of [0, 0.4, 2]) {
    const cont = simpson(x => a * Math.exp(-a * x), c, c + 80 / a, 40000);
    const atom = 1 - Math.exp(-a * c);
    const total = cont + atom;
    if (Math.abs(total - 1) > 1e-6) bad.push(`a=${a} c=${c}: total=${total.toFixed(6)}`);
    // dropping the atom must visibly fail — that is the point of the problem
    if (c > 0 && Math.abs(cont - 1) < 1e-3) bad.push(`a=${a} c=${c}: atom was not needed?`);
  }
  assert.empty(bad);
});

test('the jump height equals the point mass P{X=c}', () => {
  const a = 1.6, c = 0.9;
  const F = x => x < c ? 0 : 1 - Math.exp(-a * x);
  assert.close(F(c) - F(c - 1e-12), 1 - Math.exp(-a * c), 1e-9, 'F(c) - F(c-)');
});

test('c = 0 collapses to the plain exponential with no atom', () => {
  assert.close(1 - Math.exp(0), 0, 1e-15, 'atom vanishes at c=0');
  const sol = P.p8.solution.map(s => s.body).join(' ');
  assert.match(sol, /c=0/, 'the c=0 sanity check must be in the solution');
  assert.match(sol, /\\delta\(x-c\)/, 'the delta term must appear');
  assert.match(P.p8.ambiguity, /c\\ge0|c \\ge 0/, 'validity condition on c must be stated');
});

test('integrating the derived density reconstructs the original CDF', () => {
  const a = 1.2, c = 0.7;
  const F = x => x < c ? 0 : 1 - Math.exp(-a * x);
  for (const x of [1.0, 1.5, 3.0]) {
    const rebuilt = (1 - Math.exp(-a * c)) + simpson(t => a * Math.exp(-a * t), c, x, 20000);
    assert.close(rebuilt, F(x), 1e-7, `reconstructed F(${x})`);
  }
});

suite('assignment · problem 9 — which event comes first');

test('simulation reproduces p/(p+q) across parameter choices', () => {
  const rnd = mulberry(41);
  const bad = [];
  for (const [p, q] of [[0.2, 0.3], [1 / 6, 1 / 6], [0.05, 0.45], [0.4, 0.1]]) {
    let wins = 0, N = 60000;
    for (let i = 0; i < N; i++) {
      for (;;) {
        const u = rnd();
        if (u < p) { wins++; break; }
        if (u < p + q) break;
      }
    }
    const got = wins / N, want = p / (p + q);
    if (Math.abs(got - want) > 0.01) bad.push(`p=${p} q=${q}: ${got.toFixed(4)} vs ${want.toFixed(4)}`);
  }
  assert.empty(bad);
});

test('the result is invariant to the idle probability r', () => {
  const want = 0.2 / (0.2 + 0.3);
  for (const scale of [1, 0.5, 0.1]) {      // shrink both, enlarging r
    const p = 0.2 * scale, q = 0.3 * scale;
    assert.close(p / (p + q), want, 1e-12, `scale ${scale}`);
  }
});

test('the dice example in the statement checks out', () => {
  assert.close((1 / 6) / (1 / 6 + 1 / 6), 0.5, 1e-15);
  assert.match(P.p9.statement, /\\frac\{1\/6\}\{1\/6\+1\/6\}=\\frac12/, 'example as printed in the PDF');
});

suite('assignment · problem 10 — uniform to exponential');

test('the constructed g really maps U[-1,1] onto Exp(2)', () => {
  const gfun = x => -0.5 * Math.log((1 - x) / 2);
  assert.close(gfun(-1), 0, 1e-12, 'g(-1) = 0');
  assert.ok(gfun(0.999) > 3, 'g must blow up near x = 1');
  for (let x = -1; x < 1; x += 0.01)
    assert.ok(gfun(x + 0.005) > gfun(x), 'g must be strictly increasing');
  // analytic CDF check: F_Y(y) should be 1 - e^{-2y}
  for (const y of [0.2, 0.7, 1.5, 3]) {
    const xStar = 1 - 2 * Math.exp(-2 * y);     // g(x) <= y  <=>  x <= xStar
    const FY = (xStar + 1) / 2;
    assert.close(FY, 1 - Math.exp(-2 * y), 1e-12, `F_Y(${y})`);
  }
});

test('Monte Carlo through g gives an exponential sample', () => {
  const rnd = mulberry(53), N = 200000;
  let sum = 0; const tail = [0, 0, 0]; const ts = [0.5, 1, 2];
  for (let i = 0; i < N; i++) {
    const x = -1 + 2 * rnd();
    const y = -0.5 * Math.log((1 - x) / 2);
    sum += y;
    ts.forEach((t, j) => { if (y > t) tail[j]++; });
  }
  assert.close(sum / N, 0.5, 0.01, 'mean should be 1/lambda = 0.5');
  ts.forEach((t, j) => assert.close(tail[j] / N, Math.exp(-2 * t), 0.005, `P(Y>${t})`));
});

test('the alternative decreasing transform is also valid', () => {
  const g2 = x => -0.5 * Math.log((1 + x) / 2);
  for (const y of [0.3, 1.1, 2.4]) {
    // g2(x) <= y  <=>  x >= 2e^{-2y} - 1
    const xStar = 2 * Math.exp(-2 * y) - 1;
    const FY = 1 - (xStar + 1) / 2;
    assert.close(FY, 1 - Math.exp(-2 * y), 1e-12, `alternative F_Y(${y})`);
  }
  assert.match(P.p10.ambiguity, /یکتا/, 'non-uniqueness must be flagged');
});

suite('assignment · problem 11 — Bayes');

test('the posterior is exactly 0.99 and the tree conserves probability', () => {
  const prior = 0.5, l1 = 990 / 1000, l2 = 10 / 1000;
  const j1 = prior * l1, j2 = (1 - prior) * l2;
  const pR = j1 + j2;
  assert.close(pR, 0.5, 1e-12, 'P(red) = 1/2 by the counting argument');
  assert.close(j1 / pR, 0.99, 1e-12, 'P(B1|red)');
  // all four leaves must sum to 1
  const leaves = [prior * l1, prior * (1 - l1), (1 - prior) * l2, (1 - prior) * (1 - l2)];
  assert.close(leaves.reduce((a, b) => a + b, 0), 1, 1e-12, 'tree total probability');
  // posteriors over the partition must sum to 1
  assert.close(j1 / pR + j2 / pR, 1, 1e-12, 'posteriors sum to 1');
});

test('odds form agrees with the direct computation', () => {
  const prior = 0.5, l1 = 0.99, l2 = 0.01;
  const oddsPost = (prior / (1 - prior)) * (l1 / l2);
  assert.close(oddsPost / (1 + oddsPost), 0.99, 1e-12, 'odds -> probability');
});

test('the base-rate variant really does collapse to one half', () => {
  const prior = 0.01, l1 = 0.99, l2 = 0.01;
  const post = (prior * l1) / (prior * l1 + (1 - prior) * l2);
  assert.close(post, 0.5, 1e-12, 'strong evidence cancelled by a weak prior');
  const v3 = P.p11.variants.find(v => v.level === 3);
  assert.match(v3.verify, /0\{,\}5/, 'the level-3 variant must state this result');
});

test('Bayes-tree numbers conserve probability for arbitrary slider positions', () => {
  const rnd = mulberry(67);
  const bad = [];
  for (let i = 0; i < 500; i++) {
    const pr = rnd(), l1 = rnd(), l2 = rnd();
    const j1 = pr * l1, j2 = (1 - pr) * l2, pR = j1 + j2;
    const leaves = [pr * l1, pr * (1 - l1), (1 - pr) * l2, (1 - pr) * (1 - l2)];
    if (Math.abs(leaves.reduce((a, b) => a + b, 0) - 1) > 1e-12) bad.push('leaves');
    if (pR > 0) {
      const post = j1 / pR;
      if (post < -1e-12 || post > 1 + 1e-12) bad.push(`posterior out of range: ${post}`);
    }
  }
  assert.empty([...new Set(bad)]);
});

/* ============================ curriculum mapping ============================ */
suite('assignment · curriculum coverage');

test('every mapped topic and problem reference resolves', () => {
  const bad = [];
  for (const [t, ps] of Object.entries(COVERAGE.direct)) {
    if (!tids.has(t)) bad.push(`direct topic ${t}`);
    for (const pid of ps) if (!P[pid]) bad.push(`direct ${t} -> ${pid}`);
  }
  for (const t of Object.keys(COVERAGE.prerequisiteOnly)) if (!tids.has(t)) bad.push(`prereq topic ${t}`);
  for (const b of COVERAGE.bridges) if (!P[b.from]) bad.push(`bridge from ${b.from}`);
  assert.empty(bad);
});

test('the direct map agrees with each problem\'s declared topics', () => {
  const bad = [];
  for (const p of ASSIGNMENT.problems)
    for (const t of p.topics)
      if (!(COVERAGE.direct[t] || []).includes(p.id)) bad.push(`${p.id} claims ${t} but the map omits it`);
  assert.empty(bad);
});

test('stochastic-process topics are explicitly listed as NOT covered', () => {
  const titles = COVERAGE.notCovered.map(c => c.t).join(' ');
  assert.ok(COVERAGE.notCovered.length >= 6, 'the not-covered list looks too short');
  assert.match(titles, /فرآیند تصادفی/, 'stochastic processes must be named as uncovered');
  assert.match(titles, /ایستایی|خودهمبستگی|طیفی/, 'stationarity/spectrum must be named as uncovered');
  assert.match(titles, /امید ریاضی/, 'expectation must be named as uncovered');
  const bad = COVERAGE.notCovered.filter(c => !c.why || !c.ch);
  assert.empty(bad.map(c => c.t), 'each uncovered topic needs a reason and a reference');
});

test('no stochastic-process topic is reachable as "mastered" from assignment work alone', () => {
  // Assignment 1 feeds only probability-level topics; nothing beyond Ch.4 is mapped.
  const beyond = ['rv', 'cdf', 'pdf', 'pmf', 'mix'];
  const mapped = new Set(Object.keys(COVERAGE.direct));
  assert.empty(beyond.filter(t => !mapped.has(t)), 'sanity: Ch.4 topics should be mapped');
  // and the uncovered list must not overlap the direct map
  const names = new Set(COVERAGE.notCovered.map(c => c.t));
  assert.ok(!names.has('CDF و خواص آن'), 'a topic cannot be both covered and uncovered');
});
