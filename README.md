# Probability Workshop · کارگاه احتمال و فرآیندهای تصادفی

An interactive, Persian-language (RTL) learning environment for **probability theory and
random variables**, built around *Probability, Random Variables, and Stochastic Processes*
by **Papoulis & Pillai**.

It is not a set of slides. It is a working instrument panel: you run random experiments and
watch relative frequency converge, you drag probabilities and watch mutual exclusivity and
independence come apart, and you feed candidate functions to a checker that decides whether
they are valid CDFs and tells you which condition they violate.

> **Design premise:** a topic is never marked *mastered* because you read it. Mastery is
> unlocked only by answering recall questions correctly **and** recording solved exercises.
> This rule is enforced in code and covered by tests.

---

## Table of contents

- [What it contains](#what-it-contains)
- [Assignment 1 — deep problem solving](#assignment-1--deep-problem-solving)
- [The three instruments](#the-three-instruments)
- [Screens](#screens)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [Build](#build)
- [Testing](#testing)
- [Deployment](#deployment)
- [Progress persistence](#progress-persistence)
- [Authoring new lessons](#authoring-new-lessons)
- [Accessibility and internationalisation](#accessibility-and-internationalisation)
- [Known limitations](#known-limitations)
- [License](#license)

---

## What it contains

| Area | Contents |
|---|---|
| **Dashboard** | Per-topic status across 17 topics, a weighted readiness index for entering stochastic processes, self-assessment of 12 mathematical prerequisites, and a log of recorded exercises. |
| **14-day roadmap** | 14 × 180-minute days, each split 100′ concept and proof / 50′ problem solving / 30′ mathematics, with chapter references. |
| **Dependency graph** | A 23-node directed acyclic graph of concepts. Click any node to light up its full prerequisite chain. |
| **Proof inventory** | 16 theorems, each with a proof *strategy* and the specific trap it hides — never a finished proof. |
| **Prerequisites** | 12 mathematical skills, each with why it is needed and what counts as knowing it. |
| **Lesson 1** | Random experiments, sample space, events, σ-field — taught in 11 stages from intuition to independent exercises. |
| **CDF question** | A full treatment of "can a function be discontinuous *and* decreasing?", including Froda's theorem, monotonicity and right-continuity of `F_X`, and the Lebesgue decomposition. |
| **Assignment 1** | All 11 problems of the course's first assignment, each with a full educational package, plus a 44-question generated bank and an exam mode. See below. |
| **Assessment** | 21 auto-graded recall questions with per-option diagnostic feedback, 10 lesson exercises and 44 assignment variants — all with progressive hints and no revealed answers. |

### References

Chapter and section numbering follows the **4th edition** of Papoulis & Pillai. Where an
edition differs, the English section *title* is authoritative, not the number. No page
numbers are cited anywhere, because they vary between printings.

---

## Assignment 1 — deep problem solving

The course's first assignment (`stochastic_processes_assignment.pdf`, 3 pages, Autumn 1405) is
built into the app as structured data. Every statement was extracted from the PDF's text layer
**and checked against the rendered page images**; none was rewritten, normalised or "repaired".

Each of the 11 problems carries:

| Section | Contents |
|---|---|
| صورت سؤال | The original Persian statement, verbatim |
| ابهام | An explicit note wherever the statement leaves an assumption unstated |
| تحلیل مفهومی | What is being tested, the concepts, and live prerequisite status |
| آموزش مبانی ریاضی | 3–5 collapsible foundation blocks, each deriving what the solution will use |
| راهبرد حل | A route map — deliberately not a solution |
| نمایش تعاملی | An instrument, for the five problems where one genuinely helps |
| حل من | Your own notebook, saved locally |
| حل تشریحی | The worked solution, **hidden behind an explicit reveal** |
| بررسی و اعتبارسنجی | How to check the answer yourself, independently |
| تفسیر، اشتباهات رایج، الگو | Meaning, 4–6 named errors, and the reusable pattern |
| نقطهٔ بازبینی | One diagnostic MCQ that gates mastery |
| تمرین‌های تکمیلی | 4 new questions at levels 1–4 |

### Two findings about the source, stated rather than papered over

- **Problem 4 contains no explicit joint CDF.** It reads «بر حسب $F_{XY}(x,y)$» — *in terms of*
  $F_{XY}$. That is a well-posed general derivation, not a truncated statement, and the solution
  stays symbolic. A test asserts no concrete joint CDF ever leaks into it.
- **Problem 3(b) has a real unit ambiguity.** "Two days" against a rate of 144/year needs a year
  convention; both are carried (365-day → 0.5457, 360-day → 0.5507) rather than silently picking one.

Problems 8 and 10 carry ambiguity notes too: problem 8 is only a valid CDF for $a>0,\ c\ge0$, and
problem 10's transform is **not unique** — infinitely many $g$ work, and uniqueness returns only
under a monotonicity constraint.

### Mastery, and what it is not

A problem reaches **تسلط** only when all three hold: the diagnostic checkpoint is answered
correctly, your own worked attempt is recorded (≥ 40 characters), and at least two of its four
variants are marked solved. Clicking a button is never sufficient; `assignment.test.mjs` and a
browser check both pin this down.

### Coverage — what the assignment does *not* teach

The assignment dashboard ends with a panel listing the eight syllabus areas it never touches
(expectation and moments, general functions of a random variable, two random variables, limit
theorems, the definition of a stochastic process, stationarity and spectra, linear systems with
stochastic input, Markov chains and queueing). Finishing Assignment 1 makes you ready to *begin*
stochastic processes, not ready for them — the UI says so explicitly, and a test enforces that the
list stays populated and never overlaps the "covered" map.

### Exam mode

`#v-exam` draws a random paper from the bank with difficulty levels mixed: auto-graded
multiple-choice drawn from the 11 checkpoints plus the lesson quizzes, and open-ended problems
drawn from the 44 variants. Solutions and marking criteria stay hidden until submission, after
which you get per-option diagnostic feedback, a ranked list of weak topics linked back to the
relevant view, and a performance history.

## The three instruments

Each instrument is checked by tests that assert its *mathematics*, not its pixels.

**1 · Random experiment lab** — Five experiments (one coin, two coins, one die, two dice,
three bits over a binary symmetric channel). Click outcomes to build an event `A`, run up to
2000 trials, and watch `P̂(A) = n_A/n` converge inside a `±2σ` band on a logarithmic axis.
The BSC experiment is deliberately **non-equiprobable**: for "at least two bit errors",
naive counting gives `|A|/|S| = 0.5` while the true probability is `0.104`. That gap is the
teaching point.

**2 · Event algebra** — A schematic Venn diagram for the logic, paired with an
**exactly proportional** bar where segment widths *are* the probabilities. Nine set
operations, De Morgan shown as two operators shading an identical region, and a live verdict
panel that separates *mutually exclusive* from *independent* — including the case where both
hold, which only happens when a probability is zero.

**3 · CDF validity explorer** — Seven functions, three valid and four counter-examples.
The page numerically tests all three characterising conditions (non-decreasing,
right-continuous, limits 0 and 1) and names the one that fails. Filled and hollow markers
at every jump show `F(a)` against `F(a⁻)`, and a zoom slider demonstrates right-continuity
by eye.

---

## Screens

The app has seven views, all reachable by direct URL via hash routing
(`#v-dash`, `#v-road`, `#v-map`, `#v-thm`, `#v-pre`, `#v-l1`, `#v-q`), so refresh and
deep links work without any server-side routing.

---

## Technology

Deliberately **dependency-free**. There is no framework, no bundler, no `node_modules`.

| Concern | Choice | Why |
|---|---|---|
| Markup / styling | Hand-written HTML + CSS custom properties | The whole palette is 20 tokens; a framework would add more weight than it removes. |
| Behaviour | Classic ES5-compatible scripts sharing one scope | Loads and runs everywhere, no transpiler. |
| Mathematics | [MathJax 3.2.2](https://www.mathjax.org/) (CDN) | Correct LaTeX rendering, and it handles LTR maths inside an RTL document. |
| Fonts | Vazirmatn (body/UI), Markazi Text (display), IBM Plex Mono (data) — Google Fonts | Markazi Text is a Naskh face: it gives headings a textbook voice that a UI sans cannot. |
| Charts | Hand-drawn Canvas 2D and inline SVG | Every mark is placed from the same scale as its axis; no chart library to argue with. |
| Build | One Node script, no dependencies | A build that needs an install step is a build that breaks in a year. |
| Tests | One Node runner, no dependencies, plus headless Chromium over the DevTools Protocol | Real browser verification without Playwright/Puppeteer in the dependency tree. |
| Hosting | GitHub Pages from `docs/` on `main` | Static files, HTTPS, no server to operate. |

**Colour carries meaning, and is not decorative:** teal is *continuous* (پیوسته) and
plum is *discrete* (گسسته), consistently across plots, badges and navigation. Please keep
that mapping when extending the project.

---

## Getting started

Requires **Node.js ≥ 20** (uses the global `WebSocket` in the browser tests). Nothing to
install.

```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>

npm start          # build, then serve on http://127.0.0.1:8080 with rebuild-on-reload
```

Other entry points:

```bash
npm run build          # build docs/ (the published site) and build/artifact/
npm test               # build + 76 unit tests
npm run test:browser   # build + 51 end-to-end checks in headless Chromium
npm run test:all       # both suites
npm run serve          # serve docs/ without rebuilding
npm run verify -- <url>  # verify a deployed site over the network
```

There is no watch process: `npm start` rebuilds whenever you request `/`, so editing a file
in `src/` and reloading the browser is the entire development loop.

---

## Project layout

```
src/
  index.template.html      document shell for the web target (<head>, meta, fonts, MathJax)
  views/assignment.html    assignment dashboard, problem workspace shell, exam mode
  styles.css               the single stylesheet — design tokens live at the top
  views/                   dashboard, roadmap, dependency map, theorems, prerequisites
  lessons/                 one HTML file per lesson
  data/                    curriculum content as plain data
    topics.js  roadmap.js  graph.js  theorems.js  prereqs.js  quizzes.js  exercises.js
    assignment-a.js  assignment-b.js  assignment-c.js    the 11 problems, 4 per file group
    assignment-map.js                                    curriculum coverage and gaps
  js/
    core.js                DOM helpers, Persian digits, shared state object
    store.js               persistence: localStorage, optional cloud sync
    mastery.js             the mastery rule — read it before changing progress logic
    nav.js  dashboard.js  roadmap.js  theorems.js  prereqs.js  quiz.js  exercises.js
    dep-graph.js           prerequisite-chain highlighting
    assignment.js          assignment dashboard, problem workspace, mastery rule
    exam.js                random paper generation, grading, diagnostic feedback
    main.js                boot order and hash routing (incl. #v-a1/<problem>)
    instruments/
      canvas.js            DPR-aware sizing and theme-token reads
      experiment.js  venn.js  cdf.js   the three lesson instruments
      assignment-viz.js      Poisson quantile, density/CDF, transforms, Bayes tree
      wiring.js            binds instruments to the DOM
tools/
  manifest.mjs             assembly order — the single source of truth
  build.mjs                src/ -> docs/ (web) and build/artifact/ (claude.ai Artifact)
  serve.mjs                dependency-free static server
  test.mjs                 unit test runner
  browser-test.mjs         headless Chromium suite over the DevTools Protocol
  verify-deploy.mjs        post-deployment checks against a live URL
tests/
  _harness.mjs  data.test.mjs  math.test.mjs  mastery.test.mjs  build.test.mjs
  assignment.test.mjs    content integrity + independent verification of every answer
docs/                      BUILD OUTPUT — published by GitHub Pages, do not edit by hand
```

**Edit `src/`, never `docs/`.** CI fails the build if `docs/` is out of date.

---

## Build

```bash
node tools/build.mjs [--target=web|artifact|both] [--quiet]
```

Two targets come from one source:

- **`web`** → `docs/` — `index.html` + `styles.css` + `app.js`, plus `.nojekyll` (so GitHub
  Pages does not run the content through Jekyll) and `404.html` (so stray paths return to
  the app).
- **`artifact`** → `build/artifact/index.html` — a single self-contained file for the
  claude.ai Artifacts host, which supplies its own document skeleton. CSS and JS are inlined
  and the `<head>` wrapper is omitted.

Assembly order is declared once in `tools/manifest.mjs`. The build fails loudly if a file
listed there is missing, and collapses the per-module `"use strict"` pragmas into one at the
top of the bundle.

---

## Testing

### Unit tests — `npm test` (76 checks, ~30 ms)

Browser modules are evaluated in a `node:vm` sandbox with small stubs, so the real shipped
code is tested rather than a copy.

- **`data.test.mjs`** — curriculum integrity: the roadmap covers all 17 topics and agrees
  with each topic's declared day; the dependency graph is acyclic, has no dangling edges and
  no overlapping node boxes; every quiz question has exactly one correct option and every
  option carries real diagnostic feedback; **no hint states an answer outright**; LaTeX `$`
  delimiters balance.
- **`math.test.mjs`** — the mathematics on screen: every experiment's law sums to 1; dice
  answers match closed form (`P(at least one 6) = 11/36`, not `12/36`); the BSC contrast is
  preserved; the exact-area bar partitions the unit interval and satisfies inclusion–exclusion
  and De Morgan over 7000 random admissible triples; the CDF checker returns the right verdict
  for all seven presets; jump heights equal point masses and sum to 1; right-continuity holds
  as a *limit* at every jump while left-continuity fails.
- **`mastery.test.mjs`** — the teaching contract: reading never yields mastery, exercises
  alone never do, a passed quiz alone never does, "stuck" never counts as solved, mastery
  does not leak between topics, and readiness is 0 for a new learner.
- **`build.test.mjs`** — the built output: tags balance; exactly one view is visible at
  rest; every element the instruments bind to exists; logical CSS properties only (so RTL
  mirrors); all colour tokens declared on bare `:root` with matching light/dark sets; the
  monospace stack can render Persian; no secrets, no analytics, no outbound network calls.

### Browser tests — `npm run test:browser` (51 checks, ~2 min)

Headless Chromium driven over the DevTools Protocol — no Playwright or Puppeteer.

Boot health (no exceptions, no console errors, no failed requests) · Persian webfonts
actually loaded rather than silently falling back · MathJax typeset with no raw TeX left
visible · every view renders the expected row counts · clicking a graph node highlights its
ancestors · all three instruments draw and respond to input · empirical frequency lands
inside the 2σ band after 2000 trials · progress survives a full reload · no horizontal
overflow at 390 px, 820 px or 1280 px · deep links and refresh · keyboard focus visibility.

Pass `--keep-shots` to write screenshots to `build/screenshots/`, or
`--url=https://…` to run the whole suite against a deployed site instead of the local build.

### Deployment verification — `npm run verify -- <url>`

Checks the live site over the network: HTTPS, status and content types, that every
referenced asset resolves, that the Persian/RTL markers survived deployment, that deep links
and the 404 fallback behave, and that no secret is present in the payload.

---

## Deployment

The site is static. GitHub Pages serves `docs/` from `main`:

1. **Settings → Pages → Source:** *Deploy from a branch*
2. **Branch:** `main`, **folder:** `/docs`

Then every push to `main` that includes a rebuilt `docs/` publishes automatically. CI
(`.github/workflows/ci.yml`) builds, fails if `docs/` is stale, and runs both suites.

To deploy anywhere else, serve `docs/` as static files — the app needs no server, no
environment variables and no backend.

---

## Progress persistence

Progress is **local-first** and needs no backend:

- Every change is written to `localStorage` under `prob-workshop-v1` (and the theme under
  `prob-workshop-v1-theme`). Every access is wrapped in `try/catch`, so private windows and
  blocked site data degrade to a working but non-persisting page rather than an error.
- Saved state is loaded **before** the first render. (Getting this order wrong was a real
  bug during development: the data was on disk but every reload showed an empty dashboard.
  `mastery.test.mjs` and a browser check now guard it.)
- **Optional cloud sync:** when the page runs inside a host that provides
  `window.claude` capabilities, progress is additionally mirrored to a per-viewer private
  document so it follows the learner across devices. The host is feature-detected; on
  GitHub Pages it is simply absent and `localStorage` is the whole story. No credentials
  exist in the frontend, because there is no backend of our own to authenticate against.

Use **پاک کردن کل پیشرفت** on the dashboard to reset everything.

---

## Authoring new lessons

1. Write `src/lessons/lesson-NN-topic.html` as a `<section class="view" id="v-xx" hidden>`.
2. Add the file to `MARKUP` in `tools/manifest.mjs`, in display order.
3. Add topics to `src/data/topics.js` and schedule them in `src/data/roadmap.js`
   (the day numbers must agree — a test enforces it).
4. Add a quiz to `src/data/quizzes.js` with `need` set to the mastery threshold, and **at
   least two exercises per topic** to `src/data/exercises.js`, or mastery becomes
   unreachable and the suite fails.
5. Register the view in `NAV` in `src/js/nav.js` and in `renderAll()` in `src/js/main.js`.
6. `npm run test:all`.

Follow the house style for content: every option in a quiz names the *reasoning error*, not
just the verdict; hints escalate and never state the answer; proofs state the strategy before
the steps.

---

## Accessibility and internationalisation

- `lang="fa"`, `dir="rtl"`, and logical CSS properties throughout, so the layout mirrors
  correctly rather than being hand-flipped.
- Mathematics is forced LTR inside the RTL flow, and English technical terms are wrapped in
  `unicode-bidi: isolate` so parentheses and punctuation do not jump.
- The monospace stack carries a Persian fallback. Without it, Persian inside "data" elements
  loses its letter joining — another real bug found by looking at a screenshot.
- Visible `:focus-visible` outlines, labelled range inputs, `aria-label` on SVG diagrams,
  and `prefers-reduced-motion` respected.
- Light and dark themes are both authored, for the system preference and for the in-page
  toggle, with every token defined on bare `:root` first.

---

## Known limitations

- **Lessons 2–5 are not written yet.** They appear in the navigation as locked, and the
  roadmap and dependency graph already account for them. Only Lesson 1 and the CDF question
  are complete.
- **Mastery is self-reported for exercises.** The platform cannot mark a proof; marking an
  exercise "solved" is an honesty mechanism, which is why the dashboard also stores the text
  you wrote.
- **No server-side progress.** On GitHub Pages, clearing site data clears progress, and
  progress does not follow you between browsers or devices.
- **MathJax and the webfonts load from CDNs.** The page works offline-ish without them, but
  maths falls back to raw TeX and the typography to system fonts.
- **Browser tests need a local Chromium** (`chromium`, `chromium-browser` or
  `google-chrome`). The unit suite has no such requirement.
- **Content is Persian only.** The code, comments and this README are English; the learning
  material is not translated.

---

## License

MIT — see [LICENSE](LICENSE).

Papoulis & Pillai is referenced for structure and terminology only; no text, figures or
problems from the book are reproduced here. All explanations, examples and exercises in this
repository are original.
