import { getApiUrl } from '@/lib/api-config'

export interface InitialSyncRequest {
  syncPeriod: '6months' | '1year' | 'all'
}

export interface InitialSyncResponse {
  syncId: string
  status: string
}

export interface SyncStatusResponse {
  syncId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: {
    total: number
    processed: number
    percentage: number
  }
  currentTask: string
  estimatedTimeRemaining: number
  errorMessage?: string
}

export interface SetupStatusResponse {
  initialSetupCompleted: boolean
  lastSyncDate: string | null
}

class SyncService {
  private apiUrl: string

  constructor() {
    this.apiUrl = getApiUrl()
  }

  async startInitialSync(request: InitialSyncRequest): Promise<InitialSyncResponse> {
    const response = await fetch(`${this.apiUrl}/api/sync/initial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('初期同期の開始に失敗しました')
    }

    return response.json()
  }

  async getSyncStatus(syncId: string): Promise<SyncStatusResponse> {
    const response = await fetch(`${this.apiUrl}/api/sync/status/${syncId}`)

    if (!response.ok) {
      throw new Error('同期状態の取得に失敗しました')
    }

    return response.json()
  }

  async getSetupStatus(): Promise<SetupStatusResponse> {
    const response = await fetch(`${this.apiUrl}/api/setup/status`)

    if (!response.ok) {
      throw new Error('セットアップ状態の取得に失敗しました')
    }

    return response.json()
  }

  async completeSetup(): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/setup/complete`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('セットアップの完了に失敗しました')
    }
  }

  async retrySync(syncId: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/sync/retry/${syncId}`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('同期の再試行に失敗しました')
    }
  }
}

export const syncService = new SyncService()