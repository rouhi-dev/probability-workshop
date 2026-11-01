/** The teaching contract: a topic reaches "تسلط" (mastery) only by demonstrated
 *  work. These tests pin that rule down so a refactor cannot quietly relax it. */
import { suite, test, assert, loadModules } from './_harness.mjs';
import { DATA } from '../tools/manifest.mjs';

function fresh(state = {}) {
  const ctx = loadModules([...DATA, 'src/js/mastery.js'], {
    ST: { topics: {}, quiz: {}, ex: {}, pre: {}, thm: {}, read: {}, ...state },
  });
  return ctx;
}

suite('mastery model');

test('a fresh learner has every topic at todo', () => {
  const { TOPICS, statusOf } = fresh();
  assert.empty(TOPICS.filter(t => statusOf(t.id) !== 'todo').map(t => t.id));
});

test('reading a lesson never produces mastery — only "learning"', () => {
  // ST.read is what navigating to a lesson sets.
  const { statusOf } = fresh({ read: { exp: 1, event: 1, sigma: 1, cdf: 1 } });
  for (const id of ['exp', 'event', 'sigma', 'cdf'])
    assert.equal(statusOf(id), 'learning', `${id} after reading only`);
});

test('marking every exercise done is still not mastery without the quiz', () => {
  const { EXERCISES, statusOf } = fresh();
  const ex = {};
  for (const e of Object.values(EXERCISES).flat()) ex[e.id] = { st: 'done' };
  const g = fresh({ ex });
  for (const id of ['exp', 'event', 'sigma', 'cdf'])
    assert.ok(g.statusOf(id) !== 'mastered', `${id} reached mastery with exercises alone`);
  assert.ok(Object.keys(ex).length > 0, 'exercise fixture built');
  assert.ok(statusOf('exp') === 'todo', 'control case unaffected');
});

test('answering the quiz wrong marks the topic as needing more practice', () => {
  const { QUIZZES, statusOf } = fresh({ quiz: { quizL1: { 0: 1, 1: 2 } } }); // two wrong picks
  assert.ok(QUIZZES.quizL1, 'fixture quiz exists');
  for (const id of ['exp', 'event', 'sigma'])
    assert.equal(statusOf(id), 'practice', `${id} after wrong answers`);
});

test('quiz passed AND two exercises done is the only route to mastery', () => {
  const { QUIZZES } = fresh();
  const Q = QUIZZES.quizL1;
  const right = {};                                  // -1 is the "correct" marker
  for (let i = 0; i < Q.need; i++) right[i] = -1;

  const quizOnly = fresh({ quiz: { quizL1: right } });
  assert.ok(quizOnly.statusOf('exp') !== 'mastered', 'quiz alone must not be enough');

  const both = fresh({ quiz: { quizL1: right }, ex: { '1-1': { st: 'done' }, '1-7': { st: 'done' } } });
  assert.equal(both.statusOf('exp'), 'mastered', 'quiz + 2 exercises on that topic');
  // the two exercises were topic "exp"; a sibling topic must NOT come along for free
  assert.ok(both.statusOf('event') !== 'mastered', 'mastery must not leak across topics');
});

test('one exercise short of the threshold does not pass', () => {
  const { QUIZZES } = fresh();
  const right = {};
  for (let i = 0; i < QUIZZES.quizL1.need; i++) right[i] = -1;
  const g = fresh({ quiz: { quizL1: right }, ex: { '1-1': { st: 'done' } } });
  assert.ok(g.statusOf('exp') !== 'mastered', 'mastery granted with only 1 exercise');
});

test('"stuck" is recorded but never counts as a solved exercise', () => {
  const { QUIZZES } = fresh();
  const right = {};
  for (let i = 0; i < QUIZZES.quizL1.need; i++) right[i] = -1;
  const g = fresh({ quiz: { quizL1: right }, ex: { '1-1': { st: 'stuck' }, '1-7': { st: 'stuck' } } });
  assert.ok(g.statusOf('exp') !== 'mastered', '"stuck" must not satisfy the exercise requirement');
});

test('status labels exist for all four states', () => {
  const { STLAB } = fresh();
  assert.deep(Object.keys(STLAB).sort(), ['learning', 'mastered', 'practice', 'todo']);
  for (const v of Object.values(STLAB)) assert.ok(v && v.length > 2, 'label is non-trivial');
});

suite('readiness index');

test('readiness is 0 for a fresh learner and 100 only at full mastery', () => {
  const { TOPICS, statusOf } = fresh();
  const weight = s => (s === 'mastered' ? 1 : s === 'practice' ? 0.45 : s === 'learning' ? 0.2 : 0);
  const score = sts => {
    let tot = 0, got = 0;
    TOPICS.forEach((t, i) => { tot += t.w; got += t.w * weight(sts[i]); });
    return Math.round((100 * got) / tot);
  };
  assert.equal(score(TOPICS.map(t => statusOf(t.id))), 0, 'fresh');
  assert.equal(score(TOPICS.map(() => 'mastered')), 100, 'all mastered');
  assert.equal(score(TOPICS.map(() => 'todo')), 0, 'all todo');
  assert.ok(score(TOPICS.map(() => 'learning')) < 25, 'reading everything stays below 25%');
});

test('topics feeding stochastic processes carry the heavier weight', () => {
  const { TOPICS } = fresh();
  const w = id => TOPICS.find(t => t.id === id).w;
  for (const id of ['rv', 'cdf', 'pdf', 'axiom', 'cond'])
    assert.equal(w(id), 3, `${id} should be weight 3`);
});
