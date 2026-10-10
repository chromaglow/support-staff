// Rolling log file: one line per entry, rotated once past MAX bytes.
const fs = require('fs');
const path = require('path');

const MAX = 2 * 1024 * 1024;

function createLogger(file) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch { /* unwritable: entries are dropped */ }
  function write(level, msg) {
    const line = `${new Date().toISOString()} ${level.toUpperCase()} ${msg}\n`;
    try {
      let size = 0;
      try { size = fs.statSync(file).size; } catch { /* no file yet */ }
      if (size > MAX) { try { fs.renameSync(file, `${file}.1`); } catch { /* keep writing */ } }
      fs.appendFileSync(file, line);
    } catch { /* logging never throws */ }
  }
  return {
    file,
    info: (m) => write('info', m),
    warn: (m) => write('warn', m),
    error: (m) => write('error', m),
  };
}

module.exports = { createLogger, MAX };
