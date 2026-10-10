# Handoff: Support Staff, state as of 2026-10-10

Read this first when picking the project back up. It says what exists, what is pending,
and how to get going in ten minutes.

## What exists

A working Windows desktop app. The upstream Support Fins web app runs unmodified inside
Electron from the `upstream/` git submodule, with a **Send to Bambu** button and a settings
gear added right of upstream's Export menu. Send to Bambu writes the same 3MF upstream's
own Export 3MF produces, into `Documents\Support Fins` (never overwriting), and launches
Bambu Studio with it. Upstream's Export saves through a native dialog.

- Repo: https://github.com/chromaglow/support-staff, branch `main`, CI green.
- Local checkout: `C:\dev\GitHub\support staff` (note the space).
- Upstream pin: `da413e5` (gittrahan/support-fins main, 2026-10-10), which includes the
  Windows test-path fix we contributed (#230) and the maintainer's follow-up (#228).
- Builds: every push to `main` produces `windows-build` (NSIS installer + portable exe)
  on the Actions page. Locally, `npm run dist` puts them in `dist/`.

## Test status

| Suite | Command | Result |
| --- | --- | --- |
| Unit (our modules) | `npm run test:unit` | 17 pass |
| Smoke (Playwright Electron, dev app) | `npm run test:smoke` | 2 pass, ~5 s |
| Smoke against packaged build | `SUPPORT_STAFF_EXE="dist/win-unpacked/Support Staff.exe" npx playwright test` | 2 pass |
| Upstream's own suite, on Windows | `npm run test:upstream` | 449 pass, 0 fail, 1 ignored |
| CI | push to main | upstream suite on Linux; unit, smoke, dist, silent install, installed smoke on Windows |

## Pending, in order

1. **v1 manual gate (Ezra).** Print one real part through the app: import, rotate, Add fins,
   Send to Bambu, slice with supports off, print, snap the fins. Then add a "## v1 gate"
   section to `docs/research/2026-10-findings.md` with part, pose, settings, result.
2. **Real-parts survey (next session).** Ezra supplies a folder of STL/3MF files; run
   `node scripts/survey.js "<folder>"` and fill section 3 of the findings. Open two of the
   output 3MFs in Bambu Studio by hand to confirm orientation and the expected
   "geometry only" notice.
3. **Restyle (later phase, by design).** Everything visual lives in `app/desktop.css`; the
   upstream page is untouched. A restyle is a stylesheet injected after upstream's, nothing
   more. Not specced yet.
4. Optional small follow-ups the final review listed: refresh the spec's CSP text and smoke
   fixture lines to as-built (noted in the spec's "As built" section), and an app icon
   (`build.win.icon` in package.json; electron-builder warns about the default icon).

## Decisions that are not obvious from the code

- **Bambu launch route is the exe with the file argument, final.** The `bambustudio://`
  URL is Bambu's MakerWorld download hook and refuses local files; `--single-instance`
  silently drops the file. Both tested against Bambu Studio 2.8.2. Findings, section 5.
  A second Bambu window per send is Bambu's "Single instance" preference (off by default);
  turning it on makes Bambu load into the running window.
- **`bambuExe` must be a file named `bambu-studio.exe` on a local drive.** Security
  hardening: otherwise a compromised page could point the app at any executable and get it
  launched. Detection and the Browse dialog both satisfy it.
- **CSP hashes the inline import map on LF-normalized text.** The Windows checkout is
  CRLF; Chromium hashes LF. Without the normalization the page renders static HTML with dead
  JavaScript, and the first smoke test now catches that (it asserts no page errors).
- **The fake slicer in the smoke test is a C# program compiled at test time** with the
  `csc.exe` that ships with Windows. Packaged Electron strips `NODE_OPTIONS`, so a Node-based
  stand-in cannot record its arguments under the installed build.
- **Playwright cannot attach to electron-builder's portable exe** (self-extracting wrapper).
  Test against `dist/win-unpacked/Support Staff.exe` or the installed exe.
- **Do not launch the real Bambu Studio from automated runs.** Ezra's instruction after the
  already-running research (Task 11). The smoke test's stand-in is fine.
- **Upstream is never edited here.** Fixes go upstream as PRs from the `chromaglow` fork;
  `npm run bump-upstream` moves the pin and runs both suites.

## Resume in ten minutes

```
git clone --recurse-submodules https://github.com/chromaglow/support-staff
cd support-staff
npm install
npm test
npm run dev
```

If `node_modules/electron/dist/electron.exe` is missing after `npm install` (a local npm
setting skipped the postinstall on the original machine), run `node install.js` inside
`node_modules/electron`.

## Where things are

| What | Where |
| --- | --- |
| Design spec | `docs/specs/2026-10-10-support-fins-desktop-design.md` |
| Implementation plan (Tasks 1-14 done, 15 pending) | `docs/plans/2026-10-10-support-fins-desktop.md` |
| Research findings | `docs/research/2026-10-findings.md` |
| First survey of upstream, before the design | `docs/LOCAL-TOOL-PLAN.md` |
| Main process (scheme, CSP, downloads, menu, IPC) | `app/main.js` |
| Bridge | `app/preload.js` |
| Renderer shim (button, dialog, toast) | `app/desktop.js`, `app/desktop.css` |
| Pure modules | `app/settings.js`, `app/files.js`, `app/bambu.js`, `app/log.js` |
| Tests | `test/unit/*.test.js`, `test/smoke.spec.js`, `test/fixtures/fake-bambu/FakeBambu.cs` |
| Scripts | `scripts/stamp-upstream.js`, `scripts/bump-upstream.js`, `scripts/test-upstream.js`, `scripts/survey.js` |
| CI | `.github/workflows/ci.yml` |
| App settings and logs at runtime | `%APPDATA%\support-staff\settings.json`, `%APPDATA%\support-staff\logs\` |
