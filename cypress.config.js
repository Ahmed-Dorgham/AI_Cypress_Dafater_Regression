const { defineConfig } = require('cypress');

module.exports = defineConfig({
  allowCypressEnv: false,
  e2e: {
    defaultCommandTimeout: 40000,
    numTestsKeptInMemory: 0,
    pageLoadTimeout: 120000,
    video: false,
    supportFile: 'cypress/support/e2e.js',
    watchForFileChanges: false,
    env: {
      scope: process.env.DAFATER_SCOPE || 'Regression',
    },
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'firefox') {
          launchOptions.preferences['network.proxy.type'] = 0;
        }
        return launchOptions;
      });
      return config;
    },
  },
});




