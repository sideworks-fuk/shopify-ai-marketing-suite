describe('Sync Flow E2E Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', 'test_token');
    });
    
    // Visit sync page
    cy.visit('/sync');
  });

  describe('Initial Sync Flow', () => {
    it('should show initial sync modal for first-time users', () => {
      // Mock empty sync history
      cy.intercept('GET', '**/api/sync/history*', {
        statusCode: 200,
        body: []
      }).as('getSyncHistory');

      // Mock sync status with no previous sync
      cy.intercept('GET', '**/api/sync/status', {
        statusCode: 200,
        body: {
          products: { status: 'pending', count: 0, lastSyncAt: null },
          customers: { status: 'pending', count: 0, lastSyncAt: null },
          orders: { status: 'pending', count: 0, lastSyncAt: null },
          lastFullSyncAt: null,
          nextScheduledSyncAt: null
        }
      }).as('getSyncStatus');

      cy.visit('/sync');
      cy.wait(['@getSyncHistory', '@getSyncStatus']);

      // Check if initial sync modal appears
      cy.get('[role="dialog"]').should('be.visible');
      cy.contains('初回データ同期の設定').should('be.visible');
    });

    it('should complete initial sync setup', () => {
      // Setup mocks
      cy.intercept('GET', '**/api/sync/history*', { body: [] });
      cy.intercept('GET', '**/api/sync/status', {
        body: {
          products: { status: 'pending', count: 0, lastSyncAt: null },
          customers: { status: 'pending', count: 0, lastSyncAt: null },
          orders: { status: 'pending', count: 0, lastSyncAt: null },
          lastFullSyncAt: null
        }
      });

      cy.intercept('POST', '**/api/sync/trigger', {
        statusCode: 200,
        body: {
          success: true,
          message: '同期を開始しました',
          syncId: 'sync-123'
        }
      }).as('triggerSync');

      cy.visit('/sync');

      // Initial sync modal flow
      cy.get('[role="dialog"]').within(() => {
        // Step 1: Select sync range
        cy.contains('過去3年間').click();
        cy.contains('次へ').click();
        
        // Step 2: Confirm and start
        cy.contains('同期を開始').click();
      });

      cy.wait('@triggerSync');
      cy.contains('初回同期開始').should('be.visible');
    });
  });

  describe('Progress Polling', () => {
    it('should poll for sync progress updates', () => {
      let progress = 0;
      
      // Mock progressive updates
      cy.intercept('GET', '**/api/sync/status', (req) => {
        progress = Math.min(100, progress + 10);
        req.reply({
          statusCode: 200,
          body: {
            products: { status: 'syncing', count: 1000, lastSyncAt: null },
            customers: { status: 'pending', count: 0, lastSyncAt: null },
            orders: { status: 'pending', count: 0, lastSyncAt: null },
            activeSync: {
              type: 'products',
              progress: progress,
              total: 1000,
              current: Math.floor((progress / 100) * 1000),
              startedAt: new Date().toISOString()
            },
            lastFullSyncAt: null
          }
        });
      }).as('getSyncStatus');

      cy.visit('/sync');
      
      // Check initial progress
      cy.wait('@getSyncStatus');
      cy.contains('同期中').should('be.visible');
      
      // Wait for multiple polling cycles (simulating 30-second intervals)
      cy.wait('@getSyncStatus', { timeout: 10000 });
      cy.wait('@getSyncStatus', { timeout: 10000 });
      
      // Verify progress updates
      cy.get('[role="progressbar"]').should('exist');
    });

    it('should stop polling when sync completes', () => {
      let callCount = 0;
      
      cy.intercept('GET', '**/api/sync/status', (req) => {
        callCount++;
        const isComplete = callCount > 3;
        
        req.reply({
          statusCode: 200,
          body: {
            products: { 
              status: isComplete ? 'synced' : 'syncing', 
              count: 1000, 
              lastSyncAt: isComplete ? new Date().toISOString() : null 
            },
            customers: { status: 'synced', count: 500, lastSyncAt: new Date().toISOString() },
            orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
            activeSync: isComplete ? null : {
              type: 'products',
              progress: isComplete ? 100 : 50,
              total: 1000,
              current: isComplete ? 1000 : 500,
              startedAt: new Date().toISOString()
            },
            lastFullSyncAt: new Date().toISOString()
          }
        });
      }).as('getSyncStatus');

      cy.visit('/sync');
      
      // Wait for sync to complete
      cy.wait('@getSyncStatus');
      cy.wait('@getSyncStatus');
      cy.wait('@getSyncStatus');
      cy.wait('@getSyncStatus');
      
      // Verify sync completed
      cy.contains('同期済み').should('be.visible');
      cy.get('[role="progressbar"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should display error status correctly', () => {
      cy.intercept('GET', '**/api/sync/status', {
        statusCode: 200,
        body: {
          products: { 
            status: 'error', 
            count: 500, 
            lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
            error: 'API rate limit exceeded'
          },
          customers: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
          orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
          lastFullSyncAt: new Date(Date.now() - 86400000).toISOString()
        }
      }).as('getSyncStatus');

      cy.visit('/sync');
      cy.wait('@getSyncStatus');
      
      // Check error display
      cy.contains('エラー').should('be.visible');
      cy.contains('API rate limit exceeded').should('be.visible');
    });

    it('should handle sync trigger failures', () => {
      cy.intercept('POST', '**/api/sync/trigger', {
        statusCode: 500,
        body: {
          error: 'Internal server error'
        }
      }).as('triggerSyncError');

      cy.visit('/sync');
      
      // Try to trigger sync
      cy.contains('button', '同期').first().click();
      cy.wait('@triggerSyncError');
      
      // Check error toast
      cy.contains('同期の開始に失敗しました').should('be.visible');
    });

    it('should retry failed syncs', () => {
      // Setup initial error state
      cy.intercept('GET', '**/api/sync/status', {
        body: {
          products: { 
            status: 'error', 
            count: 500, 
            lastSyncAt: null,
            error: 'Previous sync failed'
          },
          customers: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
          orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() }
        }
      }).as('getSyncStatus');

      cy.intercept('POST', '**/api/sync/trigger', {
        body: {
          success: true,
          message: '同期を再開しました',
          syncId: 'sync-retry-123'
        }
      }).as('retrySync');

      cy.visit('/sync');
      cy.wait('@getSyncStatus');
      
      // Find product sync card with error and retry
      cy.contains('商品').parents('[class*="card"]').within(() => {
        cy.contains('button', '同期').click();
      });
      
      cy.wait('@retrySync');
      cy.contains('同期開始').should('be.visible');
    });
  });

  describe('Manual Sync Triggers', () => {
    it('should trigger sync for individual data types', () => {
      cy.intercept('GET', '**/api/sync/status', {
        body: {
          products: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
          customers: { status: 'synced', count: 500, lastSyncAt: new Date().toISOString() },
          orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
          lastFullSyncAt: new Date().toISOString()
        }
      });

      cy.intercept('POST', '**/api/sync/trigger', {
        body: {
          success: true,
          message: '商品データの同期を開始しました',
          syncId: 'sync-products-123'
        }
      }).as('triggerProductSync');

      cy.visit('/sync');
      
      // Trigger product sync
      cy.contains('商品').parents('[class*="card"]').within(() => {
        cy.contains('button', '同期').click();
      });
      
      cy.wait('@triggerProductSync').then((interception) => {
        expect(interception.request.body).to.deep.equal({ type: 'products' });
      });
    });

    it('should trigger full sync', () => {
      cy.intercept('POST', '**/api/sync/trigger', {
        body: {
          success: true,
          message: 'すべてのデータの同期を開始しました',
          syncId: 'sync-all-123'
        }
      }).as('triggerFullSync');

      cy.visit('/sync');
      
      // Find and click full sync button
      cy.contains('button', '手動同期').click();
      cy.contains('すべてのデータ').click();
      
      cy.wait('@triggerFullSync').then((interception) => {
        expect(interception.request.body).to.deep.equal({ type: 'all' });
      });
    });
  });

  describe('Sync History', () => {
    it('should display sync history correctly', () => {
      const mockHistory = [
        {
          id: '1',
          type: 'all',
          status: 'success',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3000000).toISOString(),
          duration: 600000,
          recordsProcessed: 3500,
          message: '全データの同期が完了しました'
        },
        {
          id: '2',
          type: 'products',
          status: 'error',
          startedAt: new Date(Date.now() - 7200000).toISOString(),
          completedAt: new Date(Date.now() - 7140000).toISOString(),
          duration: 60000,
          recordsProcessed: 500,
          error: 'API rate limit exceeded'
        }
      ];

      cy.intercept('GET', '**/api/sync/history*', {
        body: mockHistory
      }).as('getSyncHistory');

      cy.visit('/sync');
      cy.wait('@getSyncHistory');
      
      // Check history display
      cy.contains('同期履歴').should('be.visible');
      cy.contains('全データの同期が完了しました').should('be.visible');
      cy.contains('API rate limit exceeded').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    it('should update UI when receiving real-time sync updates', () => {
      // Start with no active sync
      cy.intercept('GET', '**/api/sync/status', {
        body: {
          products: { status: 'synced', count: 1000, lastSyncAt: new Date().toISOString() },
          customers: { status: 'synced', count: 500, lastSyncAt: new Date().toISOString() },
          orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
          activeSync: null
        }
      }).as('initialStatus');

      cy.visit('/sync');
      cy.wait('@initialStatus');
      
      // Trigger a sync
      cy.intercept('POST', '**/api/sync/trigger', {
        body: { success: true, message: '同期開始', syncId: 'sync-123' }
      }).as('triggerSync');
      
      // Mock status update with active sync
      cy.intercept('GET', '**/api/sync/status', {
        body: {
          products: { status: 'syncing', count: 1000, lastSyncAt: null },
          customers: { status: 'synced', count: 500, lastSyncAt: new Date().toISOString() },
          orders: { status: 'synced', count: 2000, lastSyncAt: new Date().toISOString() },
          activeSync: {
            type: 'products',
            progress: 25,
            total: 1000,
            current: 250,
            startedAt: new Date().toISOString()
          }
        }
      }).as('syncingStatus');
      
      cy.contains('button', '手動同期').click();
      cy.contains('商品データ').click();
      cy.wait('@triggerSync');
      
      // Wait for status update
      cy.wait('@syncingStatus');
      
      // Verify UI updates
      cy.contains('同期中').should('be.visible');
      cy.get('[role="progressbar"]').should('be.visible');
      cy.contains('250 / 1,000').should('be.visible');
    });
  });
});