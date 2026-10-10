# Research findings, 2026-10

**Verdict: GO (provisional).** Sections 3 and 5 are still pending; nothing found so far blocks the build.

## 1. Upstream tests on Windows
- Before: `deno test --allow-read tests/` gave 189 passed / 75 failed / 1 ignored, all from `URL.pathname` (a reviewer measured 189 passed / 129 failed / 1 ignored with `deno test -A` at the parent commit). After the fix: `deno test -A tests/` gives 342 passed / 1 failed / 1 ignored. The one failure is `tests/step.test.js`: on Deno 2.7.6 Windows, `createRequire()` of the vendored UMD `occt-import-js.js` returns an empty ESM namespace (Deno CJS detection), unrelated to paths; it passes with `--unstable-detect-cjs`. Upstream main's own Ubuntu CI is green; PR #230's CI run was never triggered (action_required). `plugins/cli/tests/`: 10 passed. `plugins/shared/tests/`: 84 passed.
- Our PR: https://github.com/gittrahan/support-fins/pull/230
- Upstream already has the same fix: the maintainer opened https://github.com/gittrahan/support-fins/pull/228 on 2026-10-09 (branch `tests-windows-paths`, commits e9c8469 and 9387cac), which does the same `fileURLToPath` change and additionally fixes the `tests/step.test.js` CJS loading and `plugins/freecad/tests/site_step.js`. It is not merged into main yet. Our PR #230 is therefore a duplicate, pending the user's decision to close it. Once #228 merges, the wrapper only needs a submodule bump.
- Run upstream tests with `deno test -A` (golden.test.js needs --allow-env).

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

- #215 slow generation on huge models: the stress models are too small to reproduce it; the slowest survey run was 0.4 s (plate.stl, ramp.stl), and the largest file, torus.stl (102 KB), took 0.2 s, Node startup and 3MF write included. The issue (opened 2026-10-08 by the maintainer; it has no comments) says in its body that "a commenter" (elsewhere, not in this thread) talked about a 5 ft model and that the maintainer has seen slowness from about the 300 mm range; the maintainer hedges that "Last I checked, the slowness was related to 3D rendering rather than the actual fin calculation." Our inference: the rendering is the site's browser viewer, which the CLI we wrap does not do, so this should not affect us; to be confirmed on the real parts in section 3.
- #157 fins print as strings: a user on a well-tuned QIDI Plus4 (dry PETG, Orca) got a ball of string in three orientations; bed-attached fins printed fine, but the tool left a 20+ mm tube wall unsupported and placed internal fins on near-vertical walls whose attachment failed and blobbed. Follow-up with a simpler STL repeats that too few fins are generated and the fin-covered overhangs still sag. Maintainer replied on 2026-10-02 that they'd try to reproduce; no follow-up since. An engine-quality issue that we inherit as-is, which is why the slicer check in section 3 stays on the list.
- Others read and judged not to affect us: #223 (mesh errors in calibration-coupon 3MFs in ideaMaker), #121 (insufficient fins on a headset mount, same family as #157; its readout reports 299 overhang faces too small for a fin, under 12 mm², a different bucket from the engine's unserved count), #119 (feature: separate clearance controls), #115 (sway-brace clearance and tine bite), #104 (negative volumes turned solid in the user's slicer after adding fins; slicer-side, worth remembering if a user reports it), #65 (PrusaSlicer 3.0 plugin API limits), #57 (cross-bracing), #52 (diagonal/cantilever supports), #50 (curved bases), #48 (resin-style pin supports), #46 and #45 (cutout follow-ups), #25 (fin alignment, STEP input), #18 (missed supports, same family as #157), #8 (branching fins). These are feature requests or engine-quality reports that a desktop wrapper neither causes nor can fix.

## 5. Bambu Studio launch behavior
(filled in Task 11)
