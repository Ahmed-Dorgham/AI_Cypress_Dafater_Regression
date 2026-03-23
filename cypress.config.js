const { defineConfig } = require('cypress');

const scope = process.env.DAFATER_SCOPE || 'Regression';
// Force HTTPS, fallback to default URL
const baseUrl = (process.env.DAFATER_BASE_URL || 'http://temp-qc-tmp.dafater.biz').replace(/^http:/, 'https:');
const forceFirefox110 = process.env.DAFATER_FORCE_FIREFOX_110 === '1';

module.exports = defineConfig({
  e2e: {
    baseUrl, // always HTTPS
    defaultCommandTimeout: 40000,
    pageLoadTimeout: 120000,
    video: false,
    supportFile: 'cypress/support/e2e.js',
    env: {
      scope,
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

      // Ensure the baseUrl in Cypress config is HTTPS
      config.baseUrl = baseUrl;

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
            path: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
          },
        ],
      }
    : {}),
});
