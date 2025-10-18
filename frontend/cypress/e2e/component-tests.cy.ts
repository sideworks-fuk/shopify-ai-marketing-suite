describe('Component Integration Tests', () => {
  beforeEach(() => {
    cy.loginTestUser()
  })

  describe('Sync Status Components', () => {
    beforeEach(() => {
      // Mock sync status API
      cy.intercept('GET', '**/api/sync/status', {
        statusCode: 200,
        body: {
          products: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
          customers: { status: 'syncing', count: 250, lastSyncAt: null },
          orders: { status: 'error', count: 0, lastSyncAt: null, error: 'API rate limit exceeded' },
          activeSync: {
            type: 'customers',
            progress: 50,
            total: 500,
            current: 250,
            startedAt: new Date().toISOString()
          },
          lastFullSyncAt: new Date(Date.now() - 86400000).toISOString()
        }
      }).as('getSyncStatus')
      
      cy.visit('/sync')
      cy.wait('@getSyncStatus')
    })

    it('should display sync status cards correctly', () => {
      // Check product sync status (completed)
      cy.contains('商品').parents('[class*="card"]').within(() => {
        cy.contains('同期済み').should('be.visible')
        cy.contains('1,000').should('be.visible')
      })

      // Check customer sync status (in progress)
      cy.contains('顧客').parents('[class*="card"]').within(() => {
        cy.contains('同期中').should('be.visible')
        cy.get('[role="progressbar"]').should('be.visible')
        cy.contains('250 / 500').should('be.visible')
      })

      // Check order sync status (error)
      cy.contains('注文').parents('[class*="card"]').within(() => {
        cy.contains('エラー').should('be.visible')
        cy.contains('API rate limit exceeded').should('be.visible')
      })
    })

    it('should handle manual sync trigger', () => {
      cy.intercept('POST', '**/api/sync/trigger', {
        statusCode: 200,
        body: {
          success: true,
          message: '商品データの同期を開始しました',
          syncId: 'sync-products-123'
        }
      }).as('triggerSync')

      // Trigger sync for products
      cy.contains('商品').parents('[class*="card"]').within(() => {
        cy.contains('button', '同期').click()
      })

      cy.wait('@triggerSync')
      
      // Check for success message
      cy.contains('同期を開始しました', { timeout: 5000 }).should('be.visible')
    })
  })

  describe('Dashboard Components', () => {
    it('should display KPI cards', () => {
      cy.intercept('GET', '**/api/dashboard/summary', {
        statusCode: 200,
        body: {
          totalProducts: 1000,
          totalCustomers: 500,
          totalOrders: 2000,
          totalRevenue: 150000
        }
      }).as('getDashboardSummary')

      cy.visit('/dashboard')
      cy.wait('@getDashboardSummary')

      // Check if KPI values are displayed
      cy.contains('1,000').should('be.visible')
      cy.contains('500').should('be.visible')
      cy.contains('2,000').should('be.visible')
      cy.contains('150,000').should('be.visible')
    })
  })
})