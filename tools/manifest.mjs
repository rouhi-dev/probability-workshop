// Single source of truth for assembly order.
// Plain classic scripts sharing one global scope — concatenation order is load order.

export const MARKUP = [
  'src/views/_shell-open.html',
  'src/views/dashboard.html',
  'src/views/roadmap.html',
  'src/views/dep-map.html',
  'src/views/theorems.html',
  'src/views/prereqs.html',
  'src/views/assignment.html',
  'src/lessons/lesson-01-sample-space.html',
  'src/lessons/lesson-cdf-question.html',
  'src/views/_shell-close.html',
];

// Data first: the render pass in main.js reads these at boot.
export const DATA = [
  'src/data/topics.js',
  'src/data/roadmap.js',
  'src/data/graph.js',
  'src/data/theorems.js',
  'src/data/prereqs.js',
  'src/data/quizzes.js',
  'src/data/exercises.js',
  'src/data/assignment-a.js',
  'src/data/assignment-b.js',
  'src/data/assignment-c.js',
  'src/data/assignment-map.js',
];

// Application: core helpers -> persistence -> mastery -> renderers -> boot.
export const APP = [
  'src/js/core.js',
  'src/js/store.js',
  'src/js/mastery.js',
  'src/js/nav.js',
  'src/js/dashboard.js',
  'src/js/roadmap.js',
  'src/js/theorems.js',
  'src/js/prereqs.js',
  'src/js/quiz.js',
  'src/js/exercises.js',
  'src/js/dep-graph.js',
  'src/js/assignment.js',
  'src/js/exam.js',
  'src/js/main.js',
];

// Instruments last: canvas helpers before any drawing code; wiring binds the DOM.
export const INSTRUMENTS = [
  'src/js/instruments/canvas.js',
  'src/js/instruments/experiment.js',
  'src/js/instruments/venn.js',
  'src/js/instruments/cdf.js',
  'src/js/instruments/assignment-viz.js',
  'src/js/instruments/wiring.js',
];

export const SCRIPTS = [...DATA, ...APP, ...INSTRUMENTS];
export const STYLES = ['src/styles.css'];
