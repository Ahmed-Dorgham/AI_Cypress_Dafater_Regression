const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.DAFATER_BASE_URL || 'https://temp-qc-tmp.dafater.biz',
    defaultCommandTimeout: 40000,
    pageLoadTimeout: 120000,
    video: false,
    supportFile: 'cypress/support/e2e.js',
    env: {
      scope: process.env.DAFATER_SCOPE || 'Regression',
    },
    setupNodeEvents(on, config) {
      // No special Firefox hacks needed for headed Chrome
      return config;
    },
  },
  browsers: [
    {
      name: 'chrome',
      family: 'chromium',
      displayName: 'Chrome Headed',
      channel: 'stable',
      path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
  ],
});
