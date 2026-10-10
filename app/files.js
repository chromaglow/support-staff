// Filenames and writes for the output folder. Pure except writeAtomic.
const fs = require('fs');
const path = require('path');

/** A part name the file system and a slicer both accept. Never empty. */
function safeBase(name) {
  const s = String(name ?? '')
    .replace(/[^A-Za-z0-9._ -]/g, '')
    .trim()
    .slice(0, 80)
    .replace(/^[. ]+|[. ]+$/g, '');
  return s || 'part';
}

/** `<dir>/<base><ext>`, or `<base>-2<ext>`, `-3`, ... while taken. */
function uniquePath(dir, base, ext, exists = fs.existsSync) {
  let p = path.join(dir, `${base}${ext}`);
  for (let n = 2; exists(p); n++) {
    if (n > 999) throw new Error(`no free name for ${base}${ext} in ${dir}`);
    p = path.join(dir, `${base}-${n}${ext}`);
  }
  return p;
}

/** Write to `<target>.part`, then rename: a crash never leaves a half file at target. */
async function writeAtomic(target, bytes) {
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.part`;
  try {
    await fs.promises.writeFile(tmp, bytes);
    await fs.promises.rename(tmp, target);
  } catch (e) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw e;
  }
}

module.exports = { safeBase, uniquePath, writeAtomic };
