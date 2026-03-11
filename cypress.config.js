const { defineConfig } = require('cypress');

const scope = process.env.DAFATER_SCOPE || 'Regression';
const baseUrl = process.env.DAFATER_BASE_URL || 'http://temp-qc-tmp.dafater.biz';

module.exports = defineConfig({
  e2e: {
    baseUrl,
    defaultCommandTimeout: 40000,
    pageLoadTimeout: 120000,
    video: false,
    supportFile: 'cypress/support/e2e.js',
    env: {
      scope,
    },
    // Add this block to force Cypress to use Firefox 110
    setupNodeEvents(on, config) {
      return config;
    },
  },
  browsers: [
    {
      name: 'firefox110',
      family: 'firefox',
      displayName: 'Firefox 110',
      version: '110.0',
      majorVersion: 110,
      path: 'C:\\Firefox110\\firefox.exe', // Make sure this is the actual path
    },
  ],
});
