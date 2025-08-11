# Yukiへの作業指示（同期範囲UI実装）
**日付:** 2025年8月12日（月）22:50  
**差出人:** Kenji

## 📢 重要：同期範囲管理の新仕様追加！

データ同期範囲管理の詳細設計を完了しました。
UIに新機能を追加してください。

### 📚 新規設計ドキュメント
1. **データ同期設計仕様書（更新）**
   - `/docs/04-development/data-sync-design-specification.md`
   - セクション11：UI要件追加

2. **同期範囲管理仕様書（新規）**
   - `/docs/04-development/sync-range-management.md`
   - UI実装ガイド（セクション5）

## 🆕 明日追加で実装するUI機能

### 1. 同期範囲選択コンポーネント

**新規ファイル:** `frontend/src/app/(authenticated)/sync/components/SyncRangeSelector.tsx`

```typescript
interface SyncRangeSettings {
  yearsBack: number;        // 何年前まで取得するか
  startDate?: Date;         // カスタム開始日
  endDate?: Date;           // カスタム終了日
  includeArchived: boolean; // アーカイブ済みデータを含む
}

export function SyncRangeSelector({ onRangeSelected }: Props) {
  const [settings, setSettings] = useState<SyncRangeSettings>({
    yearsBack: 3,  // デフォルト3年
    includeArchived: false
  });

  const presets = [
    { value: '1year', label: '過去1年', years: 1 },
    { value: '2years', label: '過去2年', years: 2 },
    { value: '3years', label: '過去3年（推奨）', years: 3 },
    { value: '5years', label: '過去5年', years: 5 },
    { value: 'all', label: '全期間', years: null },
    { value: 'custom', label: 'カスタム期間', years: null }
  ];

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">データ取得範囲の選択</h3>
        </div>
        
        <RadioGroup value={preset} onValueChange={handlePresetChange}>
          {presets.map((p) => (
            <div key={p.value} className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value={p.value} id={p.value} />
              <Label htmlFor={p.value}>
                {p.label}
                {p.value === '3years' && (
                  <Badge variant="outline" className="ml-2">推奨</Badge>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
        
        <Alert className="mt-4">
          <Info className="w-4 h-4" />
          <AlertDescription>
            {settings.yearsBack > 0 
              ? `${new Date().getFullYear() - settings.yearsBack}年から現在までのデータを取得します`
              : '利用可能な全てのデータを取得します'}
            <br />
            <span className="text-xs text-gray-500 mt-1">
              大量データの場合、処理に時間がかかる可能性があります
            </span>
          </AlertDescription>
        </Alert>
      </div>
    </Card>
  );
}
```

### 2. 詳細進捗表示コンポーネント

**新規ファイル:** `frontend/src/app/(authenticated)/sync/components/DetailedProgress.tsx`

```typescript
interface DetailedProgressProps {
  storeId: string;
  dataType: 'products' | 'customers' | 'orders';
}

export function DetailedProgress({ storeId, dataType }: DetailedProgressProps) {
  const { data: progress } = useApi(
    () => syncApi.getDetailedProgress(storeId, dataType),
    [storeId, dataType]
  );

  if (!progress) return null;

  return (
    <div className="space-y-4">
      {/* 全体進捗 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>全体進捗</span>
          <span>{progress.progressPercentage.toFixed(1)}%</span>
        </div>
        <Progress value={progress.progressPercentage} className="h-3" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {progress.recordsProcessed.toLocaleString()} / 
            {progress.totalRecords?.toLocaleString() || '計算中...'}
          </span>
          <span>{progress.recordsPerSecond.toFixed(1)} レコード/秒</span>
        </div>
      </div>

      {/* データ取得範囲 */}
      <div className="p-3 bg-gray-50 rounded">
        <div className="text-sm font-medium mb-1">取得範囲</div>
        <div className="text-xs text-gray-600">
          {formatDate(progress.dataRange.startDate)} 〜 
          {formatDate(progress.dataRange.endDate)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          範囲内レコード数: {progress.dataRange.recordsInRange.toLocaleString()}件
        </div>
      </div>

      {/* 完了予定時刻 */}
      {progress.estimatedCompletionTime && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            完了予定: {formatTime(progress.estimatedCompletionTime)}
            （残り{formatDuration(getTimeRemaining(progress.estimatedCompletionTime))}）
          </span>
        </div>
      )}

      {/* 再開可能状態 */}
      {progress.canResume && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            中断から再開可能です
            <br />
            <span className="text-xs">
              最終チェックポイント: {formatTime(progress.lastCheckpoint)}
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### 3. 初回同期設定モーダル

**新規ファイル:** `frontend/src/app/(authenticated)/sync/components/InitialSyncModal.tsx`

```typescript
export function InitialSyncModal({ 
  isOpen, 
  onClose, 
  onStart 
}: InitialSyncModalProps) {
  const [step, setStep] = useState(1); // 1: 範囲選択, 2: 確認
  const [settings, setSettings] = useState<SyncRangeSettings>({
    yearsBack: 3,
    includeArchived: false
  });
  const [estimates, setEstimates] = useState<RecordEstimates | null>(null);

  // データ量の推定を取得
  useEffect(() => {
    if (settings.yearsBack) {
      fetchEstimates(settings).then(setEstimates);
    }
  }, [settings.yearsBack]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? '初回同期の設定' : '同期内容の確認'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
            <SyncRangeSelector 
              onRangeSelected={setSettings}
              estimatedRecords={estimates}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={() => setStep(2)}>
                次へ
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <h3 className="font-semibold">同期内容の確認</h3>
              
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>取得期間:</span>
                  <span className="font-medium">
                    {settings.yearsBack}年前〜現在
                  </span>
                </div>
                {estimates && (
                  <>
                    <div className="flex justify-between">
                      <span>推定レコード数:</span>
                      <span className="font-medium">
                        {(estimates.products + estimates.customers + estimates.orders).toLocaleString()}件
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>推定所要時間:</span>
                      <span className="font-medium">
                        約{Math.ceil(estimates.totalSizeGB * 10)}分
                      </span>
                    </div>
                  </>
                )}
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  同期は中断しても後から再開できます。
                  進捗は自動的に保存されます。
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                戻る
              </Button>
              <Button 
                onClick={() => onStart(settings)}
                className="bg-primary"
              >
                同期を開始
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 4. sync/page.tsx の更新

```typescript
export default function SyncPage() {
  const [showInitialSyncModal, setShowInitialSyncModal] = useState(false);
  const [syncRange, setSyncRange] = useState<SyncRangeSettings | null>(null);
  
  // 初回同期が必要かチェック
  useEffect(() => {
    checkIfInitialSyncNeeded().then(needed => {
      if (needed) {
        setShowInitialSyncModal(true);
      }
    });
  }, []);

  const handleInitialSyncStart = async (settings: SyncRangeSettings) => {
    setSyncRange(settings);
    await syncApi.startInitialSync(getCurrentStoreId(), settings);
    setShowInitialSyncModal(false);
  };

  return (
    <div className="container mx-auto p-6">
      {/* 既存のコンテンツ */}
      
      {/* 同期範囲表示を追加 */}
      {syncRange && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm">
              データ取得範囲: {syncRange.yearsBack}年前〜現在
            </span>
          </div>
        </div>
      )}

      {/* 詳細進捗表示を更新 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <h4 className="font-semibold mb-4">商品データ</h4>
          <DetailedProgress storeId={getCurrentStoreId()} dataType="products" />
        </Card>
        <Card className="p-6">
          <h4 className="font-semibold mb-4">顧客データ</h4>
          <DetailedProgress storeId={getCurrentStoreId()} dataType="customers" />
        </Card>
        <Card className="p-6">
          <h4 className="font-semibold mb-4">注文データ</h4>
          <DetailedProgress storeId={getCurrentStoreId()} dataType="orders" />
        </Card>
      </div>

      {/* 初回同期モーダル */}
      <InitialSyncModal
        isOpen={showInitialSyncModal}
        onClose={() => setShowInitialSyncModal(false)}
        onStart={handleInitialSyncStart}
      />
    </div>
  );
}
```

## 🔧 API Client更新

**ファイル:** `frontend/src/lib/api/sync.ts`

```typescript
export interface SyncRangeSettings {
  yearsBack: number;
  startDate?: string;
  endDate?: string;
  includeArchived: boolean;
}

export interface DetailedProgress {
  progressPercentage: number;
  recordsProcessed: number;
  totalRecords: number | null;
  recordsPerSecond: number;
  estimatedCompletionTime?: string;
  dataRange: {
    startDate: string;
    endDate: string;
    recordsInRange: number;
  };
  canResume: boolean;
  lastCheckpoint?: string;
}

export const syncApi = {
  // 既存のメソッド...

  startInitialSync: async (
    storeId: string, 
    settings: SyncRangeSettings
  ): Promise<void> => {
    await apiClient.post('/api/sync/initial', {
      storeId,
      ...settings
    });
  },

  getDetailedProgress: async (
    storeId: string,
    dataType: string
  ): Promise<DetailedProgress> => {
    const response = await apiClient.get(
      `/api/sync/progress/${storeId}/${dataType}`
    );
    return response.data;
  },

  estimateRecords: async (
    storeId: string,
    settings: SyncRangeSettings
  ): Promise<RecordEstimates> => {
    const response = await apiClient.post('/api/sync/estimate', {
      storeId,
      ...settings
    });
    return response.data;
  }
};
```

## ✅ 実装チェックリスト（明日）

### 新規コンポーネント
- [ ] SyncRangeSelector（同期範囲選択）
- [ ] DetailedProgress（詳細進捗表示）
- [ ] InitialSyncModal（初回同期設定）

### 既存コンポーネント更新
- [ ] sync/page.tsx（範囲表示追加）
- [ ] SyncStatus（詳細進捗統合）
- [ ] SyncHistory（範囲情報追加）

### UI/UX改善
- [ ] 完了予定時刻の表示
- [ ] 処理速度の表示
- [ ] 再開可能状態の表示
- [ ] データ取得範囲の可視化

### API連携
- [ ] 範囲指定パラメータ送信
- [ ] 詳細進捗取得
- [ ] レコード数推定API

## 💡 実装のポイント

1. **ユーザビリティ**
   - デフォルトは「過去3年」推奨
   - 大量データの警告表示
   - 中断・再開可能なことを明示

2. **パフォーマンス**
   - 進捗は30秒ごとに更新
   - 不要な再レンダリング防止
   - メモ化の活用

3. **エラー処理**
   - ネットワークエラー時の表示
   - 推定値取得失敗時のフォールバック

## 📅 明日のスケジュール調整

### 8月13日（火）の優先順位
1. **9:00-10:00**: 設計仕様書の確認
2. **10:00-11:30**: SyncRangeSelector実装
3. **11:30-12:00**: InitialSyncModal実装
4. **13:00-14:30**: DetailedProgress実装
5. **14:30-16:00**: sync/page.tsx統合
6. **16:00-17:00**: APIクライアント更新
7. **17:00-18:00**: Takashiとの連携テスト

---

設計仕様書のUI要件を参考に、使いやすいインターフェースを実装してください！
特に初回同期時の範囲選択は、ユーザーにとって重要な決定なので、
分かりやすく、安心感のあるUIにしてください。

頑張ってください！

Kenji