/** Curriculum data integrity: the content model has to hold together or the
 *  dashboard reports progress that cannot be earned. */
import { suite, test, assert, loadModules } from './_harness.mjs';
import { DATA } from '../tools/manifest.mjs';

const g = loadModules(DATA);
const { TOPICS, ROADMAP, GRAPH, THEOREMS, PREREQS, QUIZZES, EXERCISES } = g;
const tids = new Set(TOPICS.map(t => t.id));
const allEx = Object.values(EXERCISES).flat();

suite('curriculum data');

test('every topic has an id, name, day, reference and readiness weight', () => {
  const bad = TOPICS.filter(t => !t.id || !t.name || !t.day || !t.ref || !t.w);
  assert.empty(bad.map(t => t.id || '(no id)'));
  assert.equal(new Set(TOPICS.map(t => t.id)).size, TOPICS.length, 'duplicate topic ids');
});

test('roadmap is exactly 14 days, numbered 1..14', () => {
  assert.equal(ROADMAP.length, 14, 'day count');
  assert.deep(ROADMAP.map(r => r.d), [...Array(14)].map((_, i) => i + 1));
});

test('every roadmap day carries concept, problem-solving and maths work', () => {
  assert.empty(ROADMAP.filter(r => !r.t || !r.concept || !r.prob || !r.math).map(r => `day ${r.d}`));
});

test('roadmap covers every topic and references no unknown topic', () => {
  const unknown = ROADMAP.flatMap(r => r.topics.filter(t => !tids.has(t)).map(t => `day ${r.d} -> ${t}`));
  assert.empty(unknown, 'unknown topic ids on roadmap');
  const covered = new Set(ROADMAP.flatMap(r => r.topics));
  assert.empty([...tids].filter(t => !covered.has(t)), 'topics never scheduled');
});

test('topic day matches the roadmap day it is scheduled on', () => {
  const mismatched = [];
  for (const r of ROADMAP) {
    for (const id of r.topics) {
      const t = TOPICS.find(x => x.id === id);
      if (t && t.day !== r.d) mismatched.push(`${id}: topic says day ${t.day}, roadmap says ${r.d}`);
    }
  }
  assert.empty(mismatched);
});

suite('dependency graph');

test('every edge connects two declared nodes', () => {
  const ids = new Set(GRAPH.nodes.map(n => n.id));
  assert.empty(GRAPH.edges.flat().filter(x => !ids.has(x)).map(x => `dangling: ${x}`));
});

test('graph is acyclic (a prerequisite chain must terminate)', () => {
  const pre = {};
  for (const [a, b] of GRAPH.edges) (pre[b] ||= []).push(a);
  const cycles = [];
  const walk = (id, path) => {
    if (path.has(id)) { cycles.push([...path, id].join(' -> ')); return; }
    for (const p of pre[id] || []) walk(p, new Set([...path, id]));
  };
  for (const n of GRAPH.nodes) walk(n.id, new Set());
  assert.empty(cycles);
});

test('an edge always points from an earlier day to a later-or-equal day', () => {
  const day = id => {
    const n = GRAPH.nodes.find(x => x.id === id);
    const t = n && n.t && TOPICS.find(x => x.id === n.t);
    return t ? t.day : null;
  };
  const wrong = GRAPH.edges
    .filter(([a, b]) => day(a) !== null && day(b) !== null && day(a) > day(b))
    .map(([a, b]) => `${a} (day ${day(a)}) -> ${b} (day ${day(b)})`);
  assert.empty(wrong, 'prerequisite scheduled after the topic that needs it');
});

test('graph nodes reference only known topics, and node boxes do not overlap', () => {
  assert.empty(GRAPH.nodes.filter(n => n.t && !tids.has(n.t)).map(n => n.id));
  const W = 118, H = 30, clash = [];
  for (let i = 0; i < GRAPH.nodes.length; i++) {
    for (let j = i + 1; j < GRAPH.nodes.length; j++) {
      const a = GRAPH.nodes[i], b = GRAPH.nodes[j];
      if (Math.abs(a.x - b.x) < W && Math.abs(a.y - b.y) < H) clash.push(`${a.id} / ${b.id}`);
    }
  }
  assert.empty(clash, 'overlapping node boxes in the SVG layout');
});

suite('quizzes');

test('each question has exactly one correct option', () => {
  const bad = [];
  for (const [qid, Q] of Object.entries(QUIZZES))
    Q.items.forEach((it, i) => {
      const n = it.opts.filter(o => o.ok).length;
      if (n !== 1) bad.push(`${qid} #${i + 1}: ${n} correct`);
    });
  assert.empty(bad);
});

test('every option carries diagnostic feedback, not just a verdict', () => {
  const bad = [];
  for (const [qid, Q] of Object.entries(QUIZZES))
    Q.items.forEach((it, i) => it.opts.forEach((o, j) => {
      if (!o.fb || o.fb.length < 40) bad.push(`${qid} #${i + 1} opt ${j + 1}`);
    }));
  assert.empty(bad, 'options with missing or trivially short feedback');
});

test('mastery threshold is reachable', () => {
  const bad = [];
  for (const [qid, Q] of Object.entries(QUIZZES)) {
    if (Q.need > Q.items.length) bad.push(`${qid}: needs ${Q.need} of ${Q.items.length}`);
    assert.ok(Q.topics.length, `${qid} covers no topic`);
    for (const t of Q.topics) if (!tids.has(t)) bad.push(`${qid}: unknown topic ${t}`);
  }
  assert.empty(bad);
});

suite('exercises');

test('exercise ids are unique and map to known topics', () => {
  const ids = allEx.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate exercise ids');
  assert.empty(allEx.filter(e => !tids.has(e.topic)).map(e => e.id), 'unknown topic');
});

test('every exercise offers at least two progressive hints', () => {
  assert.empty(allEx.filter(e => !e.hints || e.hints.length < 2).map(e => e.id));
});

test('hints guide but never hand over a final answer', () => {
  // The teaching contract forbids revealing solutions; a hint that says
  // "the answer is" has crossed the line.
  const leak = /پاسخ(\s|‌)*(نهایی|این است|برابر است)|جواب(\s|‌)*(نهایی|این است)/;
  assert.empty(allEx.filter(e => e.hints.some(h => leak.test(h))).map(e => e.id),
    'hint appears to state the answer outright');
});

test('each topic that has a quiz also has the 2 exercises mastery requires', () => {
  const byTopic = {};
  for (const e of allEx) byTopic[e.topic] = (byTopic[e.topic] || 0) + 1;
  const bad = [];
  for (const Q of Object.values(QUIZZES))
    for (const t of Q.topics)
      if ((byTopic[t] || 0) < 2) bad.push(`${t}: only ${byTopic[t] || 0} exercise(s) — mastery unreachable`);
  assert.empty([...new Set(bad)]);
});

suite('proof inventory & prerequisites');

test('every theorem has a statement, a strategy and a named trap', () => {
  assert.empty(THEOREMS.filter(t => !t.s || !t.strat || !t.trap).map(t => t.id));
  assert.equal(new Set(THEOREMS.map(t => t.id)).size, THEOREMS.length, 'duplicate theorem ids');
  assert.empty(THEOREMS.filter(t => !tids.has(t.topic)).map(t => t.id), 'unknown topic');
});

test("the professor's two assigned theorems are both present", () => {
  const assigned = THEOREMS.filter(t => t.tag === 'تمرین استاد');
  assert.equal(assigned.length, 2, 'expected exactly the two assigned proofs');
});

test('every prerequisite states why it is needed and what counts as knowing it', () => {
  assert.empty(PREREQS.filter(p => !p.n || !p.why || !p.need || !p.day).map(p => p.id || '(no id)'));
  assert.ok(PREREQS.length >= 10, 'prerequisite list looks too thin');
});

test('LaTeX in content has balanced $ delimiters', () => {
  const strings = [];
  const walk = v => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk([TOPICS, ROADMAP, THEOREMS, PREREQS, QUIZZES, EXERCISES]);
  const bad = strings.filter(s => {
    const n = (s.match(/(?<!\\)\$/g) || []).length;
    return n % 2 !== 0;
  });
  assert.empty(bad.map(s => s.slice(0, 70) + '…'), 'odd number of $ delimiters');
});
