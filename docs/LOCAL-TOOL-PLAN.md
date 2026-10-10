# Plan: running Support Fins as a local tool

Written 2026-10-10 against a fresh clone of github.com/gittrahan/support-fins on Windows 11
(Node 24.13, Deno 2.7.6, Python 3.13, Docker 29.4 all present; esbuild not installed).

## 1. What is already in the box

The repo is not a library that needs wrapping. It already ships three local paths, and
two of them were run and verified on this machine today.

| Path | Where | Status on this machine |
|---|---|---|
| Browser app, served locally | `dev-server.py` -> `http://localhost:8731/` | Verified. Renders, no network calls, three.js and the STEP WASM are vendored under `web/vendor/`. |
| Command line | `plugins/cli/support-fins.js` (Node 20.10+ or Deno 2) | Verified under both Node and Deno on `prototype/stress/models/*.stl`. Writes `.3mf` or `.stl`, `--json` output works. |
| Docker | `docker compose up --build` -> nginx on 8731 | Not run, but it is a static `nginx:stable-alpine` image of `web/`. |

The JavaScript engine is pure ES modules with no build step and no backend. The CLI and
every plugin call the same entry, `plugins/shared/engine/fins_entry.js` (`computeFins`),
which wraps `web/overhangs.js` and `web/fins.js`. Settings come from
`plugins/shared/engine/options.json` so the CLI flags equal the site's controls.

One problem found: `deno test --allow-read tests/` fails 75 of 265 tests here. Every
failure is the same cause. `tests/_util.js` builds file paths from `URL.pathname`, which on
Windows yields `/C:/dev/GitHub/support%20staff/...` (leading slash, percent-encoded
space). CI runs on Ubuntu so upstream never sees it. The engine itself is fine, as the
CLI runs prove.

## 2. Decision: what "local tool" to build

Recommended target, in order of value for effort:

1. **A standalone CLI executable** (`support-fins.exe`) on PATH. Batch-fins STL/3MF files
   from a terminal or a right-click "Send to" entry. Covers Bambu Studio, which has no
   plugin API.
2. **A one-command local web app launcher** for the interactive loop (rotate, score,
   draw braces, export). Same URL as upstream, no Python required if we add a Node
   static server.
3. Not recommended now: an Electron or Tauri desktop wrapper. The web app already runs
   offline from a static server, so a desktop shell adds ~100 MB and a build pipeline
   for no new capability. Revisit only if file-association double-click is wanted.

## 3. Work plan

### Phase 0: Windows hygiene (small, upstream-able)

- Fix `tests/_util.js` so paths come from `fileURLToPath` (or Deno 2's
  `import.meta.dirname`) instead of `URL.pathname`. Re-run `deno test --allow-read tests/`
  and expect 0 failures. Check `plugins/shared/tests/` and `plugins/cli/tests/` for the
  same pattern.
- Open a PR upstream with that one change. It is a clear bug with a clear fix.

### Phase 1: Standalone CLI binary

1. Bundle to one file: `python plugins/cli/build.py` -> `plugins/cli/build/support-fins.mjs`.
   The build script uses `npx --yes esbuild@0.28` on demand, so no global install needed.
   Verify: `node plugins/cli/build/support-fins.mjs prototype/stress/models/lbracket.stl --rot 35,0,0`.
2. Compile to an exe with Deno:
   ```
   deno compile -RW --include plugins/shared/engine/options.json -o support-fins plugins/cli/support-fins.js
   ```
   Result is roughly 70 MB and needs no runtime. Place it in a tools folder on PATH.
3. Smoke test the exe on the three sample models with `--rot`, `--material petg`,
   `--sway`, `--fins-only`, and a multi-object 3MF with `--object`.
4. Add a Windows "Send to" shortcut and a `fin-folder.cmd` that runs
   `support-fins *.stl --json` and writes a summary, so a whole folder can be finned
   without typing.

### Phase 2: Local web app launcher

1. Add a Node static server as an alternative to `dev-server.py`, so the app runs with
   Node alone. It must send `Cache-Control: no-store` like the Python server does, and
   serve `.wasm` with `application/wasm`. About 40 lines; `web/_headers` lists the
   headers the production host sends and is the reference.
2. Add `run-local.cmd` (and a `package.json` `start` script) that starts the server and
   opens `http://localhost:8731/` in the default browser.
3. Optional: keep Docker as the "no runtime" path. `docker compose up --build` already
   works unchanged.

### Phase 3: Make the engine usable from other local scripts

`computeFins(positions, options)` is a plain function. Document and test calling it from
a Node script outside `plugins/cli` so it can be wired into other local pipelines:

- Input: `Float64Array` of posed triangle vertices in mm, z up.
- Output: `{ triangles, offset, stats, pieces, overFaces, smallFaces }`.
- Example script under `scripts/` that reads an STL, calls `computeFins`, and writes
  the fins as a separate STL. `plugins/cli/cli.js` lines 150 to 190 show the exact
  read, pose, compute, write sequence to copy.

### Phase 4: Verification gates

- `deno test --allow-read tests/` passes on Windows after Phase 0.
- `deno test -A plugins/cli/tests/` passes.
- The compiled exe and the bundled `.mjs` produce byte-identical 3MF output for the
  same input and flags (the CLI tests already assert CLI equals `computeFins`).
- Open one CLI-produced 3MF in Bambu Studio or OrcaSlicer and confirm the part imports
  oriented and seated, with the "geometry only" notice the README says to expect.

## 4. Commands that work today, before any changes

```
python dev-server.py                                           # web app on :8731
node plugins/cli/support-fins.js part.stl --rot 35,0,0         # fins into part-fins.3mf
deno run -RW plugins/cli/support-fins.js part.stl --json        # same, Deno
docker compose up --build                                      # nginx on :8731
```

## 5. Risks and notes

- `deno compile` output is large (~70 MB). Fine for a personal tool; not for distribution.
- Output 3MFs are big (the lbracket sample produced a 2 MB file; the bed pad alone is
  ~28k triangles). Expected, not a bug.
- STEP import is browser-only (`web/stepworker.js` loads the occt WASM). The CLI reads
  STL and 3MF only. Adding STEP to the CLI means loading that WASM under Node, which is
  possible but a separate task.
- A Support Fins 3MF is refused as CLI input on purpose, since it already has fins.
