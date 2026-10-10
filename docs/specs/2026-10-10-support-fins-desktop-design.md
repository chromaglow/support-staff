# Support Fins Desktop: design

Date: 2026-10-10. Status: approved in brainstorming, pending written review.

## Goal

A standalone Windows desktop app that runs the Support Fins web app
(github.com/gittrahan/support-fins) unmodified, adds native file handling, and adds a
one-click "Send to Bambu Studio" that saves the finned 3MF and opens it in the slicer.
All of the upstream app's functionality stays: STL/3MF/STEP import, rotate, orientation
and load-direction scoring, auto fins, Draw mode, sway braces, calibration coupons,
STL/3MF/fins-only export, German UI.

Personal tool first. Restyling the UI is a later phase and is not in this spec.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Shell | Electron | Engine and UI are JavaScript with three.js and a WASM worker; they run unmodified in a Chromium renderer. Python would need embedded V8 or a port that discards a 265-test suite. |
| Upstream code | Git submodule, pinned to a commit, never edited | Upstream moves ~10 commits a week. Fixes go upstream as PRs; the submodule moves forward deliberately. |
| UI | Upstream UI as is, plus one button and a settings dialog | Zero functional risk. Restyle later via an injected stylesheet. |
| Bambu handoff | Separate "Send to Bambu" button; upstream Export unchanged except it saves through a native dialog | One-click for the common case; Export never launches Bambu. |
| Research depth | Light: tests green, real parts through the engine, open issues read | Real use decides where a deeper review should look. |

## Repo layout

```
support-fins-desktop/
  package.json            electron, electron-builder, @playwright/test (dev only)
  app/
    main.js               window, app menu, custom scheme, CSP, download catch,
                          settings IPC, Bambu detection and launch, logging
    preload.js            contextBridge: window.supportFinsDesktop, IPC only
    desktop.js            renderer shim: Send to Bambu button, gear button, toast,
                          startup export check; imports upstream export functions
    desktop.css           button and toast styling; later the restyle hook
    settings.js           read/write JSON in app.getPath('userData')/settings.json
    bambu.js              find Bambu Studio; launch detached with a file argument
  upstream/               git submodule -> github.com/gittrahan/support-fins
  test/
    smoke.spec.js         Playwright Electron test, see Testing
    fixtures/fake-bambu/  a stub exe or script that records its argv to a file
  docs/
    specs/                this document
    research/             findings from the research phase
  .github/workflows/ci.yml
```

## Architecture

### Loading the upstream page

- Main registers a custom scheme `app://` as standard, secure, and supporting fetch
  before the app is ready, and serves `upstream/web/` from it. `file://` is not used:
  ES module imports, the STEP WASM worker, and `fetch` of `.wasm` misbehave under it.
- The window loads `app://support-fins/index.html`.
- Renderer settings: `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`, preload `app/preload.js`.
- Main sets a Content Security Policy header on every `app://` response:
  `default-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline'`. Adjusted only if the upstream page needs it, and
  any adjustment is recorded in the findings file. No remote origin is ever allowed.
- `setWindowOpenHandler` and `will-navigate` route any external URL (Ko-fi, GitHub,
  printfins.com) to `shell.openExternal` and deny in-window navigation.

### The renderer shim

- Preload exposes `window.supportFinsDesktop` with exactly these calls:
  `saveAndOpenInBambu(bytes, baseName)`, `getSettings()`, `setSettings(partial)`,
  `browseFolder()`, `browseBambuExe()`, `detectBambu()`, `showInFolder(path)`,
  `log(level, msg)`. Each returns a Promise of `{ ok: true, ...data }` or
  `{ ok: false, error }`.
- After the upstream modules load, preload injects `app/desktop.js` as an ES module
  and `app/desktop.css`.
- `desktop.js` imports from the submodule: `buildExportGeometry` from
  `web/ui/export.js`, `writeThreeMF` from `web/threemf.js`, `splitInterface` from
  `web/prop.js`, `sessionOf` from `web/ui/session.js`, and `part`, `topology`,
  `lastResult` from `web/ui/part.js`. These are the imports upstream's own Export 3MF
  path uses, so the file Send to Bambu writes is identical to upstream's Export 3MF.
- Startup export check: `desktop.js` verifies each import is a function or defined
  value. On failure it shows a dialog naming the missing export and the pinned
  submodule commit, disables Send to Bambu, and leaves the rest of the app working.
- The shim adds two buttons to the upstream top bar, after the Export menu:
  "Send to Bambu" and a gear for settings. It uses upstream's `.btn` class so they match.
  Send to Bambu is disabled until `part`, `topology` and `lastResult` are all set,
  the same readiness rule upstream's Export menu uses. The shim re-checks readiness
  on a 500 ms interval; it does not patch upstream functions or observe upstream DOM.
- Labels are English only. Upstream's German mode leaves these two buttons English.

### Send to Bambu, end to end

1. Click. Shim calls `buildExportGeometry()`. If null, toast "Load a part and add
   fins first" and stop.
2. Shim builds the 3MF exactly as upstream's `export-3mf` handler does: `splitInterface`
   on the fin triangles, then `writeThreeMF(partTris, body, base, { separate: true,
   iface, session: sessionOf(partTris) })`. Reads the Blob into a `Uint8Array`.
3. Shim calls `saveAndOpenInBambu(bytes, base)`.
4. Main validates: `bytes` is a `Uint8Array` under 512 MB; `base` is reduced to
   `[A-Za-z0-9._ -]`, trimmed, max 80 chars, fallback `part`.
5. Main resolves `<outputFolder>/<base>-fins.3mf`; if it exists, tries `-fins-2`,
   `-fins-3`, up to 999. Writes to `<target>.part`, then renames to `<target>`.
6. Main launches Bambu Studio: `spawn(bambuExe, [target], { detached: true,
   stdio: 'ignore' })` then `unref()`. If `bambuExe` is unset or missing on disk,
   skip the launch; the save already succeeded.
7. Main returns `{ ok: true, path, opened: boolean }`. Shim shows a toast:
   "Saved lbracket-fins.3mf, opened in Bambu Studio" with a "Show in folder" link, or
   "Saved lbracket-fins.3mf. Bambu Studio not found, set it in settings" with a link
   that opens settings.

### Upstream Export menu

Unchanged in the page. Main handles `session.on('will-download')`: shows a native
save dialog with the default directory set to the output folder and the default
filename from the download (`<base>-fins.stl`, `-fins.3mf`, `-fins-only.stl`), then
saves. Cancel cancels. No launch of Bambu.

### Settings

- File: `app.getPath('userData')/settings.json`.
- Keys: `outputFolder` (default `Documents/Support Fins`, created on first save),
  `bambuExe` (string or null), `window` (`{ width, height, x, y, maximized }`).
- Dialog, opened by the gear button or the app menu: output folder with Browse,
  Bambu Studio path with Browse, a "Detect" button that reruns detection, and the
  pinned submodule commit shown read-only for bug reports.
- `setSettings` validates: `outputFolder` must be an absolute path; `bambuExe` must
  be an absolute path to an existing `.exe` or null.

### Finding Bambu Studio

Order, first hit wins and is stored in settings:
1. `%ProgramFiles%\Bambu Studio\bambu-studio.exe`, then the same under
   `%ProgramFiles(x86)%` and `%LocalAppData%\Programs\Bambu Studio`.
2. Registry `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\bambu-studio.exe`.
3. Registry `HKCR\bambustudio\shell\open\command`, parsing the exe path out of the
   command string.

Detection runs on first launch and from the Detect button. Never overwrites a path
the user set by Browse.

Research item: confirm that passing a 3MF path to a running Bambu Studio opens it in
that instance. If it does not, the launch falls back to
`shell.openExternal('bambustudio://open?file=' + encodeURIComponent(path))`, which
routes through its own single-instance handling. The chosen method is recorded in the
findings file and in `bambu.js`.

### Logging and errors

- Main writes `app.getPath('userData')/logs/support-fins-desktop.log`, rotating at
  2 MB with one backup. Entries: app start with version and submodule commit, each
  save with path and byte count, each launch with exe and argument, each error with
  stack, each IPC validation rejection.
- IPC handlers never throw across the bridge; they return `{ ok: false, error }` and
  log. The shim shows every error as a toast.
- Renderer hang on huge models (upstream issue 215) is left to Electron's standard
  unresponsive prompt so the window can be reloaded without restarting the app.

### Packaging

- `electron-builder`, NSIS installer plus a portable exe, Windows x64 only.
- `asarUnpack: ["upstream/web/vendor/**"]` so the three.js addons, the Open CASCADE
  WASM, and its worker load from real files.
- `extraResources` carries `upstream/LICENSE` (MIT) and the LGPL-2.1 files from
  `upstream/web/vendor/occt-import-js-0.0.23/` unmodified; the About dialog names both.
- Not done: code signing, auto-update, file associations.

### Development

- `npm run dev` launches Electron against the submodule with the renderer cache
  disabled and DevTools available, for the same reason upstream ships a no-cache dev
  server.
- `npm run bump-upstream` updates the submodule to origin/main, runs upstream's Deno
  tests and the smoke test, and prints the commit range; the commit is manual.

## Research phase

Done before and alongside build step 1. Output `docs/research/2026-10-findings.md`
with a go or no-go line at the top.

1. Fix `tests/_util.js` in a fork of upstream so paths come from `fileURLToPath`
   (or Deno's `import.meta.dirname`) rather than `URL.pathname`; check
   `plugins/cli/tests` and `plugins/shared/tests` for the same pattern. Get all 265
   tests green on Windows. Open a PR upstream.
2. Run upstream's CLI with `--json` on the user's real parts and five stress models
   (`lbracket`, `cube`, `staircase`, `torus`, `needle`). Record walls, tines, unserved,
   floating and wall-clock time per part. Anything that looks wrong gets the input
   and flags recorded for an upstream issue.
3. Read the open issues once; note the ones that affect daily use. Current watch list:
   215 (slow on huge models), 157 (fins print as strings).
4. Verify the already-running Bambu Studio behavior described above.

## Testing

- `test/smoke.spec.js`, Playwright's Electron driver: launch the app with a temp
  userData, settings pointing `bambuExe` at the fake Bambu stub and `outputFolder` at
  a temp dir; load `upstream/prototype/stress/models/lbracket.stl` through the file
  input; set rotation X to 35; click Add fins and wait for the readout; click Send to
  Bambu; assert the 3MF exists, parses with upstream's `readThreeMF`, has two objects,
  and the stub recorded exactly that path as its argument. Target under 30 seconds.
- CI (`windows-latest`): checkout with submodules; `deno test --allow-read` inside
  `upstream/tests` (after the path fix lands upstream, or against the fork's commit);
  `npm test` for the smoke test; `npm run dist`; silent-install the NSIS output and run
  the smoke test against the installed exe. The last step is what catches asar and
  WASM loading problems.
- Manual gate for v1: one real part through the app, opened in Bambu by the button,
  sliced with supports off, printed, fins snapped off.

## Build order

1. Research items 1 and 2. Half a day.
2. Electron shell: custom scheme, CSP, external links, window state. Import, rotate,
   Add fins, Export all work exactly as on the site. One day.
3. Download catch, settings file and dialog. Half a day.
4. Send to Bambu button, Bambu detection, research item 4. One day.
5. Smoke test, CI, packaged build, license files. One day.

## Out of scope for v1

Restyling, watch folder, batch mode (upstream's CLI covers it), gcode, macOS or
Linux builds, code signing, auto-update, file associations, STEP in the CLI.
