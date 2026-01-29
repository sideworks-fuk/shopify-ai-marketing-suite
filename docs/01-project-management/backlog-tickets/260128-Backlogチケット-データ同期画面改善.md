# Backlogチケット: データ同期画面の改善

## タイトル
初期設定画面（データ同期画面）の選択肢見直しとUX改善

## 種別
改善

## 優先度
中

## 説明

### 問題1: 選択肢の見直し

**現状**:
- 初期設定画面に「3ヶ月」「6ヶ月」「1年」「全期間」の選択肢がある
- 3ヶ月の選択肢は不要かもしれない
- 初期設定時に選択肢の意味が不明確

**改善内容**:
- ✅ 選択肢は残す（お客さんによっては3年、4年分のデータを持っている場合があるため）
- ✅ 選択肢の見直し
  - **3ヶ月を削除**
  - **6ヶ月、1年、全期間を残す**
- 全期間を一気に取得するのではなく、期間を選択できるようにする

### 問題2: 文言の統一

**現状**:
- 「初期データ同期」の下の文言が「初回同期」に変わってしまっている

**改善内容**:
- ✅ 「初期データ同期」の下の文言を「初回同期」に統一
- 文言の一貫性を保つ

### 問題3: タブの並び順

**現状**:
- タブの並び順が最適化されていない

**改善内容**:
- ✅ タブの並び順を調整
  - 同期履歴を1番後ろに持っていくか、1番先頭に持っていくか検討
  - ユーザビリティを考慮した最適な順序に決定

### 問題4: デフォルト動作の改善

**現状**:
- 毎回初期設定画面が先に出る
- 1回同期した後も、次回アクセス時に初期設定タブが表示される

**改善内容**:
- ✅ デフォルト動作の改善
  - **1回同期したら、以降は初期設定タブではなく同期履歴タブから始まるようにする**
  - 毎回初期設定画面が先に出るのは避ける
  - ユーザーが既に同期済みの場合は、同期履歴を最初に表示

**実装方針**:
- 初期設定完了フラグ（`InitialSetupCompleted`）を確認
- 完了済みの場合は、デフォルトで「同期履歴」タブを表示
- 未完了の場合は、従来通り「初期設定」タブを表示

## 完了条件
- [x] 初期設定画面の選択肢から「3ヶ月」を削除
- [x] 「6ヶ月」「1年」「全期間」の選択肢を残す
- [x] `SyncPeriod`型から`'3months'`を削除
- [x] 「初期データ同期」の下の文言を「初回同期」に統一（見出しを「初回同期」に変更）
- [x] タブの並び順を調整（同期履歴の位置を決定：lastSyncTime 有無で動的変更）
- [x] デフォルト動作を改善（1回同期したら同期履歴タブから始まる）
- [x] 初期設定完了フラグ（`InitialSetupCompleted`）に基づくタブ表示制御を実装（`lastSyncTime` で判定）
- [x] 同期履歴が存在する場合のデフォルトタブを「history」に設定
- [ ] 動作確認完了（初期設定未完了時は「setup」タブ、完了後は「history」タブ）

## 技術詳細

### 対象ファイル
- `frontend/src/app/setup/initial/page.tsx`
  - 38行目: `SyncPeriod`型定義（`'3months'`を削除）
  - 115行目: `syncPeriod`のデフォルト値（`'3months'`→`'6months'`に変更）
  - 121行目: `activeTab`の初期値（条件付きで`'history'`に設定）
  - 778-800行目: 初期設定タブのラジオボタン（`3months`の項目を削除）
  - 997-1017行目: 手動同期タブのラジオボタン（`3months`の項目を削除）
  - 726-743行目: タブの並び順定義（`TabsList`コンポーネント）

### 実装ポイント

#### 1. 選択肢の削除
```typescript
// 修正前
type SyncPeriod = '3months' | '6months' | '1year' | 'all'
const [syncPeriod, setSyncPeriod] = useState<SyncPeriod>('3months')

// 修正後
type SyncPeriod = '6months' | '1year' | 'all'
const [syncPeriod, setSyncPeriod] = useState<SyncPeriod>('6months') // デフォルトを6ヶ月に変更
```

**対象箇所**:
- `frontend/src/app/setup/initial/page.tsx` の38行目付近
- ラジオボタンの選択肢定義箇所（`RadioGroup`コンポーネント）

#### 2. デフォルトタブの制御
```typescript
// 修正前
const [activeTab, setActiveTab] = useState('setup')

// 修正後
// 初期設定完了フラグまたは同期履歴の存在を確認
const [activeTab, setActiveTab] = useState(() => {
  // バックエンドから取得した同期統計情報を確認
  // syncStats が存在し、lastSyncTime がある場合は初期設定完了とみなす
  // または、Stores.InitialSetupCompleted フラグを確認
  const hasCompletedSync = syncStats?.lastSyncTime != null
  return hasCompletedSync ? 'history' : 'setup'
})

// または、useEffectで同期統計取得後にタブを切り替え
useEffect(() => {
  if (syncStats?.lastSyncTime) {
    setActiveTab('history')
  }
}, [syncStats])
```

**実装方針**:
- `fetchSyncStats`で取得した`syncStats.lastSyncTime`の有無で判定
- または、バックエンドAPIから`InitialSetupCompleted`フラグを取得して判定

#### 3. タブの並び順
**現状**: 「初期設定」「同期履歴」「手動同期」の順

**検討事項**:
- オプション1: 「同期履歴」「初期設定」「手動同期」（履歴重視）
- オプション2: 「初期設定」「手動同期」「同期履歴」（設定重視）
- **推奨**: 初期設定完了後は「同期履歴」を先頭に、未完了時は「初期設定」を先頭に

**実装**:
```typescript
// タブの順序を動的に変更
const tabOrder = syncStats?.lastSyncTime 
  ? ['history', 'setup', 'trigger']  // 完了後: 履歴優先
  : ['setup', 'history', 'trigger']  // 未完了: 設定優先
```

## 関連資料
- 議事録: `docs/01-project-management/00_meeting/260128-打合せ議事録.md` セクション2
- 初期設定画面: `frontend/src/app/setup/initial/page.tsx`

## 対応者
福田さん

## 関連チケット
- 議事録のアクションアイテム: 2026-01-28 打合せ議事録 セクション2、8

## 実装手順

### ステップ1: 選択肢の削除
1. `SyncPeriod`型から`'3months'`を削除
2. `syncPeriod`のデフォルト値を`'3months'`から`'6months'`に変更
3. 初期設定タブのラジオボタンから「3ヶ月」の項目を削除（778-783行目付近）
4. 手動同期タブのラジオボタンから「3ヶ月」の項目を削除（997-1002行目付近）

### ステップ2: 文言の統一
1. 「初期データ同期」の下の文言を確認
2. 「初回同期」に統一されているか確認
3. 必要に応じて修正

### ステップ3: タブの並び順調整
1. タブの並び順を検討（同期履歴を先頭にするか後ろにするか）
2. `TabsList`コンポーネント内の`TabsTrigger`の順序を変更

### ステップ4: デフォルトタブの改善
1. `fetchSyncStats`で取得した`syncStats.lastSyncTime`を確認
2. `lastSyncTime`が存在する場合は`activeTab`を`'history'`に設定
3. `useEffect`で`syncStats`の変更を監視し、タブを自動切り替え

## 備考
- 動画撮影の準備のため、優先的に対応が必要
- ユーザビリティ向上が主な目的
- 既存の機能を壊さないよう注意して実装すること
- 手動同期タブの選択肢も同様に修正が必要（現状は手動同期では期間指定は使用されていないが、UIの一貫性のため）
