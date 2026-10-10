// settings.json in the user data folder. Pure functions; main passes the paths.
const fs = require('fs');
const path = require('path');

const LOCAL_ABS = /^[A-Za-z]:\\/;   // drive-letter absolute path; rejects UNC (\\host\share) and relative

function defaults(documentsDir) {
  return {
    outputFolder: path.join(documentsDir, 'Support Fins'),
    bambuExe: null,
    window: { width: 1400, height: 900, x: undefined, y: undefined, maximized: false },
  };
}

function load(file, documentsDir) {
  const d = defaults(documentsDir);
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...d, ...j, window: { ...d.window, ...(j.window || {}) } };
  } catch {
    return d;
  }
}

function validate(partial) {
  const errors = [];
  if ('outputFolder' in partial) {
    if (typeof partial.outputFolder !== 'string' || !LOCAL_ABS.test(partial.outputFolder)) {
      errors.push('outputFolder must be an absolute path on a local drive');
    }
  }
  if ('bambuExe' in partial && partial.bambuExe !== null) {
    const e = partial.bambuExe;
    if (typeof e !== 'string' || !LOCAL_ABS.test(e) || path.basename(e).toLowerCase() !== 'bambu-studio.exe' || !fs.existsSync(e)) {
      errors.push('bambuExe must be an absolute local path to an existing bambu-studio.exe, or null');
    }
  }
  return errors;
}

/** Validate, merge, write, return the new settings. Throws on a bad value. */
function save(file, current, partial) {
  const errors = validate(partial);
  if (errors.length) throw new Error(errors.join('; '));
  const next = { ...current, ...partial };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
  return next;
}

module.exports = { defaults, load, validate, save, LOCAL_ABS };
