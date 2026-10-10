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
Reviewed 2026-10-10: 17 open issues (`gh issue list --repo gittrahan/support-fins --state open`).

- #215 slow generation on huge models: the stress models are too small to reproduce it; the slowest survey run was 0.4 s (plate.stl, ramp.stl), and the largest file, torus.stl (102 KB), took 0.2 s, Node startup and 3MF write included. The thread (opened 2026-10-08 by the maintainer, no comments yet) reports slowness from about 300 mm parts up to a commenter's 5 ft model and says the time went to 3D rendering in the browser, not the fin calculation. The CLI we wrap does no rendering, so this should not affect us; to be confirmed on the real parts in section 3.
- #157 fins print as strings: a user on a well-tuned QIDI Plus4 (dry PETG, Orca) got a ball of string in three orientations; bed-attached fins printed fine, but the tool left a 20+ mm tube wall unsupported and placed internal fins on near-vertical walls whose attachment failed and blobbed. Follow-up with a simpler STL repeats that too few fins are generated and the fin-covered overhangs still sag. Maintainer is reproducing; no fix yet. An engine-quality issue that we inherit as-is, which is why the slicer check in section 3 stays on the list.
- Others read and judged not to affect us: #223 (mesh errors in calibration-coupon 3MFs in ideaMaker), #121 (insufficient fins on a headset mount, same family as #157, 299 unserved overhangs), #119 (feature: separate clearance controls), #115 (sway-brace clearance and tine bite), #104 (negative volumes turned solid in the user's slicer after adding fins; slicer-side, worth remembering if a user reports it), #65 (PrusaSlicer 3.0 plugin API limits), #57 (cross-bracing), #52 (diagonal/cantilever supports), #50 (curved bases), #48 (resin-style pin supports), #46 and #45 (cutout follow-ups), #25 (fin alignment, STEP input), #18 (missed supports, same family as #157), #8 (branching fins). These are feature requests or engine-quality reports that a desktop wrapper neither causes nor can fix.

## 5. Bambu Studio launch behavior
(filled in Task 11)
