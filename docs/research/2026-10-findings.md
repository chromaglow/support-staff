# Research findings, 2026-10

**Verdict: GO.**

## 1. Upstream tests on Windows
- Before: `deno test --allow-read tests/` gave 189 passed / 75 failed, all from `URL.pathname` (a reviewer measured 189 passed / 129 failed with `deno test -A` at the parent commit). After the fix: `deno test -A tests/` gives 342 passed / 1 failed / 1 ignored. The one failure is `tests/step.test.js`: on Deno 2.7.6 Windows, `createRequire()` of the vendored UMD `occt-import-js.js` returns an empty ESM namespace (Deno CJS detection), unrelated to paths; it passes with `--unstable-detect-cjs` and on Linux CI. `plugins/cli/tests/`: 10 passed. `plugins/shared/tests/`: 84 passed.
- PR: https://github.com/gittrahan/support-fins/pull/230
- Run upstream tests with `deno test -A` (golden.test.js needs --allow-env).
- Possible upstream follow-up: `plugins/freecad/tests/site_step.js` has the same `.pathname` pattern (outside the test suites).

## 2. Engine on stress models (--rot 40,0,0)
Run: `node scripts/survey.js upstream/prototype/stress/models --rot 40,0,0` (Node 24.13.0, upstream at 8ada90d). 22 models, no ERROR rows.

| file | walls | tines | unserved | floating | s | note |
|---|---|---|---|---|---|---|
| arch.stl | 4 | 22 | 0 | 0 | 0.3 | 4 walls, 22 tines |
| bar.stl | 1 | 4 | 0 | 0 | 0.2 | 1 wall, 4 tines |
| coin.stl | 7 | 68 | 0 | 0 | 0.2 | 7 walls, 68 tines |
| cone.stl | 4 | 26 | 0 | 0 | 0.2 | 4 walls, 26 tines |
| cube.stl | 3 | 18 | 0 | 0 | 0.2 | 3 walls, 18 tines |
| cylinder.stl | 3 | 16 | 0 | 0 | 0.2 | 3 walls, 16 tines |
| hexprism.stl | 3 | 13 | 0 | 0 | 0.2 | 3 walls, 13 tines |
| lbracket.stl | 1 | 8 | 0 | 0 | 0.3 | 1 wall, 8 tines |
| lowledge.stl | 5 | 30 | 0 | 0 | 0.2 | 5 walls, 30 tines |
| needle.stl | 4 | 26 | 0 | 0 | 0.2 | 4 walls, 26 tines |
| plate.stl | 7 | 63 | 0 | 0 | 0.4 | 7 walls, 63 tines |
| plus.stl | 4 | 20 | 0 | 0 | 0.2 | 4 walls, 20 tines |
| portal.stl | 2 | 10 | 0 | 0 | 0.2 | 2 walls, 10 tines |
| pyramid.stl | 5 | 27 | 0 | 0 | 0.1 | 5 walls, 27 tines |
| ramp.stl | 6 | 28 | 0 | 0 | 0.4 | 6 walls, 28 tines |
| sphere.stl | 4 | 17 | 0 | 0 | 0.2 | 4 walls, 17 tines |
| staircase.stl | 3 | 16 | 0 | 0 | 0.3 | 3 walls, 16 tines |
| torus.stl | 8 | 24 | 0 | 0 | 0.2 | 8 walls, 24 tines |
| tshape.stl | 5 | 24 | 0 | 0 | 0.3 | 5 walls, 24 tines |
| tube.stl | 2 | 10 | 0 | 0 | 0.2 | 2 walls, 10 tines |
| ushape.stl | 2 | 14 | 0 | 0 | 0.3 | 2 walls, 14 tines |
| wedge.stl | 3 | 13 | 0 | 0 | 0.2 | 3 walls, 13 tines |

Unrotated sphere: 4 walls, 18 tines (smoke-test fixture). The stress models are all small (largest file torus.stl, 102 KB); the slowest runs were plate.stl and ramp.stl at 0.4 s, torus.stl at 0.2 s. The times include Node startup and the 3MF write.

## 3. Engine on real parts
no real parts supplied; stress models only. The user will supply a folder later; rerun `node scripts/survey.js <folder>`.
Slicer check: pending.

## 4. Open upstream issues that affect daily use
(filled in Task 3)

## 5. Bambu Studio launch behavior
(filled in Task 11)
