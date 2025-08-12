describe('Error Handling Tests', () => {
  beforeEach(() => {
    cy.loginTestUser()
  })

  describe('API Error Handling', () => {
    it('should handle sync status API errors gracefully', () => {
      cy.intercept('GET', '**/api/sync/status', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getSyncStatusError')

      cy.visit('/sync')
      cy.wait('@getSyncStatusError')

      // Check for error message display
      cy.contains('データの取得に失敗しました', { timeout: 10000 }).should('be.visible')
    })

    it('should handle sync trigger failures', () => {
      // First, set up successful status call
      cy.intercept('GET', '**/api/sync/status', {
        statusCode: 200,
        body: {
          products: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
          customers: { status: 'synced', count: 500, lastSyncAt: new Date().toISOString() },
          orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
          lastFullSyncAt: new Date().toISOString()
        }
      }).as('getSyncStatus')

      // Then set up failed sync trigger
      cy.intercept('POST', '**/api/sync/trigger', {
        statusCode: 500,
        body: { error: 'Sync trigger failed' }
      }).as('triggerSyncError')

      cy.visit('/sync')
      cy.wait('@getSyncStatus')

      // Try to trigger sync
      cy.contains('button', '手動同期').first().click()
      cy.contains('すべてのデータ').click()
      
      cy.wait('@triggerSyncError')

      // Check for error toast/message
      cy.contains('同期の開始に失敗しました', { timeout: 10000 }).should('be.visible')
    })

    it('should handle network timeouts', () => {
      cy.intercept('GET', '**/api/sync/status', {
        delay: 30000, // 30 second delay to simulate timeout
        statusCode: 200,
        body: {}
      }).as('getSlowSyncStatus')

      cy.visit('/sync')
      
      // Check that loading state is shown
      cy.get('[data-testid="loading-spinner"], [data-testid="skeleton-loader"]')
        .should('be.visible')

      // Wait briefly to ensure loading state is working
      cy.wait(2000)
      
      // The loading state should still be visible
      cy.get('[data-testid="loading-spinner"], [data-testid="skeleton-loader"]')
        .should('be.visible')
    })
  })

  describe('Form Validation', () => {
    it('should validate sync range selection', () => {
      cy.intercept('GET', '**/api/sync/history*', { body: [] })
      cy.intercept('GET', '**/api/sync/status', {
        body: {
          products: { status: 'pending', count: 0, lastSyncAt: null },
          customers: { status: 'pending', count: 0, lastSyncAt: null },
          orders: { status: 'pending', count: 0, lastSyncAt: null },
          lastFullSyncAt: null
        }
      })

      cy.visit('/sync')

      // If initial sync modal appears, check validation
      cy.get('body').then(($body) => {
        if ($body.find('[role="dialog"]').length > 0) {
          cy.get('[role="dialog"]').within(() => {
            // Try to proceed without selecting sync range
            cy.contains('次へ').click()
            
            // Should show validation message or stay on same step
            cy.contains('範囲を選択してください').should('be.visible')
              .or(cy.contains('次へ').should('be.visible'))
          })
        }
      })
    })
  })

  describe('Authentication Errors', () => {
    it('should handle missing authentication', () => {
      // Clear authentication
      cy.window().then((win) => {
        win.localStorage.clear()
      })

      cy.visit('/sync')

      // Should redirect to auth or show auth error
      cy.url().should('include', '/auth')
        .or(cy.contains('認証が必要です').should('be.visible'))
        .or(cy.contains('ログインしてください').should('be.visible'))
    })
  })
})