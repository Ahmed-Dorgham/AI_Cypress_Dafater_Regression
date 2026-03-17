const { defineConfig } = require('cypress');

const scope = process.env.DAFATER_SCOPE || 'Regression';
const baseUrl = process.env.DAFATER_BASE_URL || 'https://temp-qc-tmp.dafater.biz';
const forceFirefox110 = process.env.DAFATER_FORCE_FIREFOX_110 === '1';

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
    setupNodeEvents(on, config) {
      return config;
    },
  },
  ...(forceFirefox110
    ? {
        browsers: [
          {
            name: 'firefox110',
            family: 'firefox',
            displayName: 'Firefox 110',
            version: '110.0',
            majorVersion: 110,
            path: 'C:\\Firefox110\\firefox.exe',
          },
        ],
      }
    : {}),
});
