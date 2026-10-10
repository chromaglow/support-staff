const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'test',
  testMatch: '*.spec.js',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
});
