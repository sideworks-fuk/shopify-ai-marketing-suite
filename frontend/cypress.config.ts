import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    // Test files pattern
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    // Exclude examples and original sync-flow test for now
    excludeSpecPattern: [
      '**/1-getting-started/*', 
      '**/2-advanced-examples/*',
      '**/sync-flow.cy.ts'
    ],
    env: {
      // Environment variables for tests
      API_BASE_URL: 'http://localhost:5001',
    },
    experimentalStudio: true,
    chromeWebSecurity: false,
    retries: {
      runMode: 2,
      openMode: 0
    }
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
})