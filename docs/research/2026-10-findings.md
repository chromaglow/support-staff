# Research findings, 2026-10

**Verdict: GO.** v1 is built, reviewed and green in CI (2026-10-10). Section 3 (real parts) is deferred to the next session, and the v1 print gate is Ezra's; see `docs/HANDOFF.md`.

**Update, 2026-10-10 evening:** both upstream PRs merged (#230 at 18:35 UTC, then #228 at 18:41 UTC). The submodule was bumped to `da413e5`; `npm run test:upstream` on this Windows machine now gives 449 passed, 0 failed, 1 ignored. Section 1 below is kept as the record of the state before that.

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
Deferred to the next session by Ezra (2026-10-10): no real parts supplied yet; stress models only. When a folder is available, run `node scripts/survey.js "<folder>"`, paste the table here, then open two of the output 3MFs in Bambu Studio by hand and record the orientation check and the "geometry only" notice.
Slicer check: pending with the above.

## 4. Open upstream issues that affect daily use
Reviewed 2026-10-10: 17 open issues (`gh issue list --repo gittrahan/support-fins --state open`).

- #215 slow generation on huge models: the stress models are too small to reproduce it; the slowest survey run was 0.4 s (plate.stl, ramp.stl), and the largest file, torus.stl (102 KB), took 0.2 s, Node startup and 3MF write included. The issue (opened 2026-10-08 by the maintainer; it has no comments) says in its body that "a commenter" (elsewhere, not in this thread) talked about a 5 ft model and that the maintainer has seen slowness from about the 300 mm range; the maintainer hedges that "Last I checked, the slowness was related to 3D rendering rather than the actual fin calculation." Our inference: the rendering is the site's browser viewer, which the CLI we wrap does not do, so this should not affect us; to be confirmed on the real parts in section 3.
- #157 fins print as strings: a user on a well-tuned QIDI Plus4 (dry PETG, Orca) got a ball of string in three orientations; bed-attached fins printed fine, but the tool left a 20+ mm tube wall unsupported and placed internal fins on near-vertical walls whose attachment failed and blobbed. Follow-up with a simpler STL repeats that too few fins are generated and the fin-covered overhangs still sag. Maintainer replied on 2026-10-02 that they'd try to reproduce; no follow-up since. An engine-quality issue that we inherit as-is, which is why the slicer check in section 3 stays on the list.
- Others read and judged not to affect us: #223 (mesh errors in calibration-coupon 3MFs in ideaMaker), #121 (insufficient fins on a headset mount, same family as #157; its readout reports 299 overhang faces too small for a fin, under 12 mm², a different bucket from the engine's unserved count), #119 (feature: separate clearance controls), #115 (sway-brace clearance and tine bite), #104 (negative volumes turned solid in the user's slicer after adding fins; slicer-side, worth remembering if a user reports it), #65 (PrusaSlicer 3.0 plugin API limits), #57 (cross-bracing), #52 (diagonal/cantilever supports), #50 (curved bases), #48 (resin-style pin supports), #46 and #45 (cutout follow-ups), #25 (fin alignment, STEP input), #18 (missed supports, same family as #157), #8 (branching fins). These are feature requests or engine-quality reports that a desktop wrapper neither causes nor can fix.

## 5. Bambu Studio launch behavior
Bambu Studio 2.8.2.61 (`FileVersion` of `C:\Program Files\Bambu Studio\bambu-studio.exe`; `ProductVersion` is empty), Windows 11, this machine's `%APPDATA%\BambuStudio\BambuStudio.conf` has `"single_instance": false` (the default; Preferences > "Single instance"). Driven with Playwright Electron like `test/smoke.spec.js`, settings `bambuExe` pointing at the real exe, and the Bambu process table (`Get-Process bambu-studio`, plus a Win32 `EnumWindows` listing of its windows) polled every 5 s after each send.

**Conclusion: exe launch with the file argument is sufficient; no code change.** Each send reliably lands the saved 3MF in Bambu Studio. With the "single instance" preference off, a send while Bambu is already running starts a *second full instance* for the new file rather than handing it to the running one; the running instance is left untouched. The two alternatives considered are worse (below), so the launch route stays `spawn(exe, [file], { detached: true })`.

### Observed: two sends from the app (clean baseline, no Bambu running)
Send 1: import `sphere.stl`, Add fins (4 fins, 18 tines), Send to Bambu. Toast: "Saved sphere-fins.3mf, opened in Bambu Studio".

| after send 1 | processes | windows (class, title) |
|---|---|---|
| T+5 s | 1: pid 43676, started 10:43:02 | splash (`wxWindowNR`, no title) |
| T+20 s | 1 | main window ` - BambuStudio` + `#32770` "Loading..." |
| T+25 s | 1 | `sphere-fins - BambuStudio` |

Send 2 while that instance was running: the plan's `cube.stl` reports "none possible" for fins unrotated (so do torus, tshape, portal); `lowledge.stl` gives 3 fins and was used instead. Toast: "Saved lowledge-fins.3mf, opened in Bambu Studio".

| after send 2 | processes | windows |
|---|---|---|
| T+5 s | 2: pid 43676 (`sphere-fins - BambuStudio`), pid 43384 started 10:47:12 | 43384: splash |
| T+25 s | 2 | 43384: `lowledge-fins - BambuStudio`; 43676 unchanged |

App log (`userData\logs\support-fins-desktop.log`):
```
2026-10-10T17:46:38.275Z INFO launched C:\Program Files\Bambu Studio\bambu-studio.exe C:\Users\ezras\AppData\Local\Temp\support-staff-t11-Vj0Iyq\out\sphere-fins.3mf pid 43676
2026-10-10T17:47:12.560Z INFO launched C:\Program Files\Bambu Studio\bambu-studio.exe C:\Users\ezras\AppData\Local\Temp\support-staff-t11-Vj0Iyq\out\lowledge-fins.3mf pid 43384
```
So: not one instance reused, no prompt in the running instance; a second `bambu-studio.exe` with its own window, the file opened as a project (Prepare tab, both objects selected; screenshot `bambu-second-instance-sphere.png` in the task scratchpad). Startup to a titled window took 25 s in the clean runs and up to 60 s in an earlier run where it also showed a `#32770` "Bambu Studio - Load 3mf" dialog for ~35 s (not reproduced in the clean runs; someone was using the desktop during the session, so dialog timing may not be Bambu's alone). The first time the app was driven, Bambu was already running with the user's own unsaved project (pid 16868, "* Untitled", started the day before): a send then behaved the same way, a new instance, and the user's instance was not touched by the exe route.

Why: `src/slic3r/GUI/InstanceCheck.cpp` (`instance_check`) only looks for a running instance when `single_instance` is on in the app config or `--single-instance` is on the command line; otherwise it logs "Another instance not found or single-instance not set" and starts normally. With the preference on, it would find the window by class `wxWindowNR` + title containing "BambuStudio", send the arguments via `WM_COPYDATA`, and exit, and `OtherInstanceMessageHandler::handle_message` loads the paths into the running instance. That is the user's preference, not ours to set.

### Alternatives tested and rejected
- `bambustudio://open?file=<url-encoded local path>` (what Step 3 of the plan would have switched to; the handler in `HKCR\bambustudio\shell\open\command` is the same exe with `"%1"`). It is the MakerWorld download hook: `GUI_App::post_init` strips `file=`, URL-decodes it, and checks the host against a trusted-site table; a local path fails that and a public build shows the "This file is not from a trusted site, do you want to open it anyway?" message dialog (observed as `#32770` "Bambu Studio info"). Observed with a direct `Start-Process` of the URL: a new instance (pid 193488) started, showed that dialog, and ended as `Untitled - BambuStudio` with nothing loaded. It also coincided with the exit of the user's pre-existing instance (pid 16868) ~25 s after the launch: no crash dump, no event-log entry, and the source has no code that terminates another instance; the most likely explanation is that someone at the desk closed it. Ezra confirmed afterwards (2026-10-10) that nothing was lost from that project. Not usable for local files.
- `bambu-studio.exe --single-instance <file>` (the flag `instance_check` honors regardless of the preference). Observed with the `sphere-fins` instance running: the new process exited within 5 s and the running instance was unchanged after 60 s (title, window position, plate thumbnail; it was not maximized or brought to the foreground, which `EnumWindowsProc` does on a hash match). The file was silently dropped. Not usable.

### Also confirmed in passing
- The detached spawn survives the app quitting: after `app.quit()` from inside the app, the Bambu instance (pid 195560) was still running. Playwright's `app.close()` kills the Electron process tree (`taskkill /T`), so under the smoke test harness Bambu would go with it; the fake slicer there exits on its own, so the test is unaffected.
- Per-send cost of the current route: a second Bambu window and ~25 s of startup for every send while Bambu is open. If that bothers users, the fix is on their side (Preferences > Single instance), and it could be documented in the user guide.

## 6. CSP adjustments
No directive was changed; the policy is exactly the one in the plan (`default-src 'self'`, no remote origin, `script-src 'self'` plus a sha256 hash for the inline import map).

One fix to how the hash is computed (`cspFor` in `app/main.js`): the upstream submodule stores `web/index.html` with LF, but this Windows checkout has `core.autocrlf=true`, so the file on disk is CRLF. The HTML parser normalizes CRLF to LF before hashing an inline script, so Chromium expected `sha256-D2Xnio...` while main.js, hashing the raw bytes, sent `sha256-aN2+71...`. Symptom: "Executing inline script violates the following Content Security Policy directive", then "Failed to resolve module specifier three" because the import map never applied; the page rendered its static HTML but `app.js` could not load. Fix: normalize `\r\n` to `\n` in the import-map text before hashing. The same hash now comes out on LF and CRLF checkouts, and in a packaged build whatever the line endings of the copied file.

Expected, not an adjustment: opening the Plugins menu logs two console errors ("Connecting to https://api.github.com/... violates ... connect-src 'self'" and "Fetch API cannot load ..."); upstream catches the failed fetch and shows its fallback labels.
