// Cypress Custom Commands

// Custom command to select elements by data-cy attribute
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`)
})

// Custom command for test user login
Cypress.Commands.add('loginTestUser', () => {
  cy.window().then((win) => {
    // Set test authentication token
    win.localStorage.setItem('auth_token', 'test_token_12345')
    win.localStorage.setItem('user_id', 'test_user_id')
    win.localStorage.setItem('shop_domain', 'test-shop.myshopify.com')
  })
})

// Custom command to wait for API loading states
Cypress.Commands.add('waitForApiLoading', () => {
  // Wait for any loading spinners to disappear
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist')
  // Wait for skeleton loaders to disappear
  cy.get('[data-testid="skeleton-loader"]', { timeout: 10000 }).should('not.exist')
})

// Add type definitions for the custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      dataCy(value: string): Chainable<JQuery<HTMLElement>>
      loginTestUser(): Chainable<void>
      waitForApiLoading(): Chainable<void>
    }
  }
}

export {}