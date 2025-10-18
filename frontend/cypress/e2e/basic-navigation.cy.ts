describe('Basic Navigation Tests', () => {
  beforeEach(() => {
    // Mock authentication for all tests
    cy.loginTestUser()
  })

  it('should load the homepage successfully', () => {
    cy.visit('/')
    
    // Check if the page loads without errors
    cy.get('body').should('be.visible')
    
    // Check for basic navigation elements
    cy.get('nav, header, [role="navigation"]').should('exist')
  })

  it('should navigate to sync page', () => {
    cy.visit('/sync')
    
    // Mock sync status API call
    cy.intercept('GET', '**/api/sync/status', {
      statusCode: 200,
      body: {
        products: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
        customers: { status: 'synced', count: 500, lastSyncAt: new Date().toISOString() },
        orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
        lastFullSyncAt: new Date().toISOString()
      }
    }).as('getSyncStatus')
    
    cy.wait('@getSyncStatus')
    
    // Check if sync page elements are present
    cy.contains('同期状況').should('be.visible')
    cy.contains('商品').should('be.visible')
    cy.contains('顧客').should('be.visible')
    cy.contains('注文').should('be.visible')
  })

  it('should navigate to dashboard', () => {
    cy.visit('/dashboard')
    
    // Mock dashboard API calls
    cy.intercept('GET', '**/api/dashboard/summary', {
      statusCode: 200,
      body: {
        totalProducts: 1000,
        totalCustomers: 500,
        totalOrders: 2000,
        totalRevenue: 150000
      }
    }).as('getDashboardSummary')
    
    // Check if dashboard elements are present
    cy.get('body').should('contain', 'ダッシュボード')
  })
})