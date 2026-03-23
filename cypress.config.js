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
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'firefox') {
          launchOptions.args.push('-safe-mode');
          launchOptions.preferences['layers.acceleration.disabled'] = true;
          launchOptions.preferences['gfx.webrender.enabled'] = false;
          launchOptions.preferences['gfx.webrender.all'] = false;
          launchOptions.preferences['gfx.webrender.force-disabled'] = true;
          launchOptions.preferences['media.hardware-video-decoding.enabled'] = false;
        }
        return launchOptions;
      });
      return config;
    },
  },
});
