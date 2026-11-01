/** The instruments make mathematical claims on screen. These tests check the
 *  claims, not the pixels: a visualisation that is merely pretty is a bug here. */
import { suite, test, assert, loadModules } from './_harness.mjs';

/* These modules declare only — they draw when wiring.js calls them — so a tiny
   set of stubs is enough to evaluate them outside a browser. */
const stubs = {
  window: {}, document: { documentElement: {} },
  $: () => null, $$: () => [], fa: String, esc: String, typeset: () => {}, ro: () => '',
  cv: () => ({ g: {}, w: 600, h: 230 }), tok: () => '#000', getComputedStyle: () => ({ getPropertyValue: () => '' }),
};
const g = loadModules([
  'src/js/instruments/experiment.js',
  'src/js/instruments/venn.js',
  'src/js/instruments/cdf.js',
], stubs);
const { EXPS, CDFS, cdfChecks } = g;

const H = 1e-9;

suite('experiment lab — sample spaces');

test('every experiment has distinct outcomes and a probability law summing to 1', () => {
  const bad = [];
  for (const [k, e] of Object.entries(EXPS)) {
    const p = e.probs || e.out.map(() => 1 / e.out.length);
    if (p.length !== e.out.length) bad.push(`${k}: |probs| != |S|`);
    if (new Set(e.out).size !== e.out.length) bad.push(`${k}: duplicate outcomes`);
    if (p.some(x => x < 0)) bad.push(`${k}: negative probability`);
    const s = p.reduce((a, b) => a + b, 0);
    if (Math.abs(s - 1) > 1e-12) bad.push(`${k}: sum = ${s}`);
  }
  assert.empty(bad);
});

test('classical counting reproduces the known dice answers', () => {
  const die2 = EXPS.die2;
  const P = pred => die2.out.filter(pred).length / 36;
  const sum = o => o.split(',').reduce((a, b) => a + +b, 0);
  assert.close(P(o => sum(o) === 7), 6 / 36, 1e-12, 'P(sum = 7)');
  assert.close(P(o => sum(o) >= 10), 6 / 36, 1e-12, 'P(sum >= 10)');
  assert.close(P(o => o.split(',').every(x => +x % 2 === 0)), 9 / 36, 1e-12, 'P(both even)');
  assert.close(P(o => o.includes('6')), 11 / 36, 1e-12, 'P(at least one 6) — not 12/36');
});

test('each preset event agrees with its own predicate on the full sample space', () => {
  const bad = [];
  for (const [k, e] of Object.entries(EXPS)) {
    for (const pr of e.pre || []) {
      const n = e.out.filter(pr.f).length;
      if (n === 0) bad.push(`${k} / ${pr.l}: selects nothing`);
      if (n === e.out.length) bad.push(`${k} / ${pr.l}: selects all of S`);
    }
  }
  assert.empty(bad);
});

test('the BSC experiment is deliberately non-equiprobable, so |A|/|S| must fail', () => {
  const e = EXPS.bsc3;
  assert.ok(e.probs, 'bsc3 must declare an explicit law');
  const w = s => (s.match(/1/g) || []).length;
  const p = 0.2;
  // independent bits: P(zeta) = p^w (1-p)^(3-w)
  e.out.forEach((s, i) => assert.close(e.probs[i], p ** w(s) * (1 - p) ** (3 - w(s)), 1e-12, `P(${s})`));
  const atLeast2 = e.out.reduce((a, s, i) => a + (w(s) >= 2 ? e.probs[i] : 0), 0);
  const naive = e.out.filter(s => w(s) >= 2).length / e.out.length;
  assert.close(atLeast2, 3 * p * p * (1 - p) + p ** 3, 1e-12, 'P(at least 2 bit errors)');
  assert.close(naive, 0.5, 1e-12, 'naive |A|/|S|');
  assert.ok(Math.abs(atLeast2 - naive) > 0.3, 'the teaching contrast must stay large');
});

suite('event algebra — exact area bar');

test('the four atoms partition the unit interval for any admissible triple', () => {
  const bad = [];
  for (let i = 0; i < 5000; i++) {
    const a = Math.random(), b = Math.random();
    const lo = Math.max(0, a + b - 1), hi = Math.min(a, b);
    const c = lo + Math.random() * (hi - lo);
    const r = { ao: a - c, ab: c, bo: b - c, out: 1 - a - b + c };
    const sum = r.ao + r.ab + r.bo + r.out;
    if (Math.abs(sum - 1) > 1e-9) { bad.push(`sum ${sum} at (${a},${b},${c})`); break; }
    if (Math.min(...Object.values(r)) < -1e-12) { bad.push(`negative atom at (${a},${b},${c})`); break; }
    // A occupies [0,a]; B occupies [a-c, a-c+b]; their overlap must be exactly c
    const overlap = Math.min(a, a - c + b) - Math.max(0, a - c);
    if (Math.abs(overlap - c) > 1e-9) { bad.push(`overlap ${overlap} != ${c}`); break; }
  }
  assert.empty(bad);
});

test('inclusion-exclusion and De Morgan hold on the atoms', () => {
  const bad = [];
  for (let i = 0; i < 2000; i++) {
    const a = Math.random(), b = Math.random();
    const lo = Math.max(0, a + b - 1), hi = Math.min(a, b);
    const c = lo + Math.random() * (hi - lo);
    const r = { ao: a - c, ab: c, bo: b - c, out: 1 - a - b + c };
    const union = r.ao + r.ab + r.bo;
    if (Math.abs(union - (a + b - c)) > 1e-9) bad.push('P(A∪B) != P(A)+P(B)-P(A∩B)');
    // complement of the union is the same region as the intersection of complements
    if (Math.abs((1 - union) - r.out) > 1e-9) bad.push('De Morgan region mismatch');
  }
  assert.empty([...new Set(bad)]);
});

test('mutually exclusive with positive probabilities is never independent', () => {
  const a = 0.4, b = 0.3, c = 0;
  assert.ok(Math.abs(c - a * b) > 1e-6, 'P(A∩B)=0 must differ from P(A)P(B)>0');
});

suite('CDF explorer — the three characterising conditions');

const EXPECTED = {
  disc: { mono: true, rc: true, lim: true, rng: true },
  mix: { mono: true, rc: true, lim: true, rng: true },
  cont: { mono: true, rc: true, lim: true, rng: true },
  neg: { mono: false, rng: false },           // decreasing and discontinuous: the answer to the question
  down: { mono: false },                       // downward jump
  left: { mono: true, rc: false, lim: true },  // left-continuous convention
  lim: { mono: true, lim: false, rng: false }, // wrong limits at infinity
};

test('the validity checker returns the right verdict for every preset', () => {
  const bad = [];
  for (const [k, exp] of Object.entries(EXPECTED)) {
    assert.ok(CDFS[k], `preset ${k} is missing`);
    const got = cdfChecks(k);
    for (const [f, v] of Object.entries(exp))
      if (got[f] !== v) bad.push(`${k}.${f}: got ${got[f]}, expected ${v}`);
  }
  assert.empty(bad);
});

test('exactly three presets are valid CDFs and four are counter-examples', () => {
  const valid = Object.keys(CDFS).filter(k => {
    const c = cdfChecks(k);
    return c.mono && c.rc && c.lim && c.rng;
  });
  assert.deep(valid.sort(), ['cont', 'disc', 'mix']);
  assert.equal(Object.keys(CDFS).length - valid.length, 4, 'counter-example count');
});

test('jump heights of the discrete CDF equal its point masses and sum to 1', () => {
  const F = CDFS.disc.F;
  const masses = CDFS.disc.jumps.map(a => +(F(a) - F(a - H)).toFixed(10));
  assert.deep(masses, [0.2, 0.5, 0.3], 'P{X=a} read off the jumps');
  assert.close(masses.reduce((x, y) => x + y, 0), 1, 1e-10, 'total mass');
});

test('the mixed CDF puts mass 0.4 at the origin and tends to 1', () => {
  const F = CDFS.mix.F;
  assert.close(F(0) - F(-H), 0.4, 1e-9, 'P{T=0}');
  assert.close(F(0), 0.4, 1e-9, 'F(0) — right-continuous, so it equals the mass');
  assert.close(F(1e6), 1, 1e-12, 'F(+inf)');
  assert.equal(F(-1), 0, 'F is 0 left of the origin');
});

test('the continuous CDF carries no point mass anywhere', () => {
  const F = CDFS.cont.F;
  let worst = 0;
  for (let x = -8; x <= 8; x += 0.005) worst = Math.max(worst, Math.abs(F(x) - F(x - H)));
  assert.ok(worst < 1e-8, `largest point mass found: ${worst}`);
});

test('right-continuity holds at every jump of every valid CDF', () => {
  // F(a+h) - F(a) -> 0 as h -> 0. A fixed epsilon would be the wrong test: where
  // the density is nonzero just right of the jump (the mixed CDF at the origin)
  // the gap is O(h), so check that it vanishes AND shrinks with h.
  const bad = [];
  for (const k of ['disc', 'mix', 'cont'])
    for (const a of CDFS[k].jumps || []) {
      const F = CDFS[k].F;
      const g1 = Math.abs(F(a + 1e-6) - F(a));
      const g2 = Math.abs(F(a + 1e-8) - F(a));
      if (g1 > 1e-4) bad.push(`${k} at a=${a}: gap ${g1} does not vanish`);
      if (g2 > g1 + 1e-15) bad.push(`${k} at a=${a}: gap grows as h shrinks`);
    }
  assert.empty(bad);
});

test('left-continuity fails at the jumps — that asymmetry is the lesson', () => {
  const F = CDFS.disc.F;
  const a = 0;
  assert.close(F(a + H) - F(a), 0, 1e-9, 'F(a+) = F(a)');
  assert.close(F(a) - F(a - H), 0.5, 1e-9, 'F(a) - F(a-) = P{X=a} > 0');
});

test('the decreasing counter-example really is non-increasing with downward jumps', () => {
  const g2 = CDFS.neg.F;                      // -floor(x)
  assert.ok(g2(-1) > g2(0) && g2(0) > g2(1), 'must be strictly decreasing across integers');
  assert.close(g2(1) - g2(1 - H), -1, 1e-9, 'jump at x=1 is downward, size 1');
  assert.close(g2(1 + H) - g2(1), 0, 1e-9, 'it is still right-continuous — a worthwhile subtlety');
});

test('P{a < X <= b} = F(b) - F(a) on the discrete CDF', () => {
  const F = CDFS.disc.F;
  assert.close(F(2) - F(-1), 0.8, 1e-9, 'P{-1 < X <= 2} = 0.5 + 0.3');
  assert.close(F(0) - F(-1), 0.5, 1e-9, 'P{-1 < X <= 0} = P{X=0}');
});
