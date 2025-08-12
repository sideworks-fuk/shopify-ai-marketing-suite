// Cypress E2E Support File
// This file is processed and loaded automatically before your test files.

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>
      
      /**
       * Custom command to login with test user
       * @example cy.loginTestUser()
       */
      loginTestUser(): Chainable<void>
      
      /**
       * Custom command to wait for API loading to complete
       * @example cy.waitForApiLoading()
       */
      waitForApiLoading(): Chainable<void>
    }
  }
}

// Hide fetch/XHR requests from command log to reduce noise
const app = window.top!
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style')
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }'
  style.setAttribute('data-hide-command-log-request', '')
  app.document.head.appendChild(style)
}