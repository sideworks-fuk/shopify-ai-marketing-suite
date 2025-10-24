# Azure Static Web Apps と GitHub Workflow の環境変数設定ガイド

## メタ情報
- **作成日**: 2025-10-23
- **最終更新**: 2025-10-23
- **対象**: フロントエンド開発者、DevOpsエンジニア
- **前提知識**: Next.js、Azure Static Web Apps、GitHub Actions

---

## 📋 結論（先に答え）

**設定が必要な場所は「環境変数の種類」によって異なります：**

| 環境変数の種類 | ビルド時に必要 | ランタイムで必要 | 設定場所 |
|--------------|------------|--------------|---------|
| **`NEXT_PUBLIC_*`** (クライアント側) | ✅ ビルド時に埋め込み | ❌ 不要 | **GitHub Workflow のみ** |
| **サーバー側のみ** (API routes等) | ❌ 不要 | ✅ ランタイムで読み込み | **Azure Static Web Apps のみ** |
| **ビルド時もランタイムでも使う** | ✅ | ✅ | **両方に設定** |

---

## 🏗️ 仕組みの詳細解説

### **1. GitHub Workflow の環境変数の役割**

```yaml
# .github/workflows/develop_frontend.yml
env:
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
  NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.NEXT_PUBLIC_SHOPIFY_API_KEY }}
```

#### **役割：ビルド時の変数注入**

```
GitHub Actions実行環境
    ↓
npm run build (Next.jsビルド)
    ↓
NEXT_PUBLIC_* を JavaScript バンドルに埋め込み
    ↓
静的ファイル (.next/static/*) 生成
    ↓
Azureにアップロード
```

#### **重要な特性**
- ✅ **ビルド時に JavaScript コードに直接埋め込まれる**
- ✅ ビルド後の静的ファイルに含まれる
- ❌ ランタイムでは変更不可（再ビルドが必要）
- ⚠️ **クライアント側のコードに露出**（ブラウザで見える）

---

### **2. Azure Static Web Apps の環境変数の役割**

Azure Portal → Static Web Apps → Configuration → Application settings

#### **役割：ランタイム時の変数提供**

```
ブラウザからリクエスト
    ↓
Azure Static Web Apps (サーバーサイド)
    ↓
API Routes (/api/*) 実行
    ↓
process.env から環境変数を読み取り
    ↓
レスポンス返却
```

#### **重要な特性**
- ✅ **サーバーサイドでのみ利用可能**
- ✅ デプロイ後でも変更可能（再起動のみ）
- ✅ セキュアな情報を安全に保管
- ❌ クライアント側（ブラウザ）からは直接アクセス不可

---

## 🔍 Next.js における環境変数の種類

### **A. `NEXT_PUBLIC_*` プレフィックス付き**

```typescript
// クライアント側のコードで使える
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
console.log(apiUrl); // ブラウザのコンソールに表示される
```

**特徴：**
- ✅ ビルド時に JavaScript バンドルに埋め込まれる
- ✅ クライアント側（ブラウザ）で利用可能
- ⚠️ **誰でもブラウザの開発者ツールで見られる**
- 📍 **設定場所：GitHub Workflow のみ**

**用途例：**
- APIエンドポイントURL
- 公開可能なAPI Key（Shopify Storefront API等）
- アプリケーションの公開設定
- 機能フラグ（`NEXT_PUBLIC_DISABLE_FEATURE_GATES`）

---

### **B. プレフィックスなし（サーバーサイド専用）**

```typescript
// app/api/secret/route.ts (API Routes)
export async function GET() {
  const secretKey = process.env.SECRET_API_KEY; // OK
  return Response.json({ key: secretKey });
}
```

```typescript
// app/components/MyComponent.tsx (クライアント側)
const secretKey = process.env.SECRET_API_KEY; // undefined になる！
```

**特徴：**
- ✅ サーバーサイドでのみ利用可能
- ✅ セキュアな情報を安全に保管
- ❌ クライアント側では `undefined`
- 📍 **設定場所：Azure Static Web Apps のみ**

**用途例：**
- データベース接続文字列
- 秘密のAPI Key（Shopify Admin API等）
- JWT署名キー
- 外部サービスのシークレット

---

## 📊 具体的な設定例

### **シナリオ1：公開API URLの設定**

```typescript
// 使用例：frontend/src/lib/api-client.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

#### **設定方法**

**✅ GitHub Workflow（ビルド時）**
```yaml
# .github/workflows/develop_frontend.yml
env:
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
```

**❌ Azure Static Web Apps**
```
不要（ビルド時に埋め込み済み）
```

---

### **シナリオ2：秘密のAPI Key（サーバーサイド）**

```typescript
// 使用例：frontend/src/app/api/shopify/products/route.ts
const adminApiKey = process.env.SHOPIFY_ADMIN_API_KEY;
```

#### **設定方法**

**❌ GitHub Workflow**
```
不要（サーバーサイド専用）
```

**✅ Azure Static Web Apps（ランタイム）**
```
Application settings:
SHOPIFY_ADMIN_API_KEY = shpat_xxxxxxxxxxxxx
```

---

### **シナリオ3：両方で使う環境変数**

```typescript
// ビルド時：next.config.js で使う
const apiUrl = process.env.API_URL;

// ランタイム：API Routesでも使う
// frontend/src/app/api/health/route.ts
const apiUrl = process.env.API_URL;
```

#### **設定方法**

**✅ GitHub Workflow（ビルド時）**
```yaml
env:
  API_URL: ${{ vars.API_URL }}
```

**✅ Azure Static Web Apps（ランタイム）**
```
Application settings:
API_URL = https://api.example.com
```

**⚠️ 注意：両方で同じ値を設定する必要がある**

---

## 🎯 現在のプロジェクトの環境変数

### **クライアント側（`NEXT_PUBLIC_*`）**

| 変数名 | 用途 | 設定場所 |
|--------|-----|---------|
| `NEXT_PUBLIC_ENVIRONMENT` | 環境識別（development/staging/production） | GitHub Workflow |
| `NEXT_PUBLIC_API_URL` | バックエンドAPIのURL | GitHub Workflow |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | Shopify Storefront API Key | GitHub Workflow |
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | 機能ロック解除フラグ（開発用） | GitHub Workflow |

### **サーバー側（プレフィックスなし）**

現在は使用していませんが、将来的に以下のような変数が必要になる可能性があります：

| 変数名（例） | 用途 | 設定場所 |
|------------|-----|---------|
| `SHOPIFY_ADMIN_API_KEY` | Shopify Admin API Key | Azure Static Web Apps |
| `DATABASE_URL` | データベース接続文字列 | Azure Static Web Apps |
| `JWT_SECRET` | JWT署名キー | Azure Static Web Apps |

---

## 🔐 セキュリティのベストプラクティス

### **1. 公開して良い情報 → `NEXT_PUBLIC_*`**

```typescript
✅ NEXT_PUBLIC_API_URL
✅ NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_KEY (公開用)
✅ NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
✅ NEXT_PUBLIC_DISABLE_FEATURE_GATES (開発環境のみ)
```

### **2. 秘密にすべき情報 → プレフィックスなし**

```typescript
❌ SHOPIFY_ADMIN_API_KEY (管理用)
❌ DATABASE_CONNECTION_STRING
❌ JWT_SECRET
❌ STRIPE_SECRET_KEY
❌ AZURE_STORAGE_CONNECTION_STRING
```

### **3. セキュリティチェックリスト**

- [ ] `NEXT_PUBLIC_*` に秘密情報を含めていないか？
- [ ] ブラウザで見られても問題ない情報か？
- [ ] Admin APIキーなどの管理権限を持つ情報はサーバー側専用か？
- [ ] GitHub Secretsで適切に管理されているか？
- [ ] `.env.local` をgitignoreに追加しているか？

---

## 📝 推奨設定フロー

### **Step 1: 環境変数を分類**

新しい環境変数を追加する前に、以下の質問に答えてください：

1. **クライアント側（ブラウザ）で使う？**
   - YES → `NEXT_PUBLIC_*` を使用
   - NO → プレフィックスなし

2. **公開されても問題ない情報？**
   - YES → `NEXT_PUBLIC_*` でOK
   - NO → プレフィックスなし（サーバー側専用）

3. **ビルド時に必要？ランタイムで必要？**
   - ビルド時のみ → GitHub Workflow
   - ランタイムのみ → Azure Static Web Apps
   - 両方 → 両方に設定

---

### **Step 2: GitHub Secrets/Variables に登録**

```bash
# GitHubリポジトリ → Settings → Secrets and variables → Actions

# Variables タブ（公開情報）
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SHOPIFY_API_KEY
NEXT_PUBLIC_DISABLE_FEATURE_GATES

# Secrets タブ（秘密情報）
SHOPIFY_ADMIN_API_KEY
DATABASE_URL
JWT_SECRET
```

**使い分け：**
- **Variables**: ログに表示されても問題ない情報
- **Secrets**: ログでマスクされる秘密情報

---

### **Step 3: GitHub Workflowに追加**

```yaml
# .github/workflows/develop_frontend.yml
- name: 🚀 Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    app_build_command: 'npm run build'
  env:
    # ビルド時に必要な変数のみ
    NEXT_PUBLIC_ENVIRONMENT: ${{ steps.env.outputs.next_public_environment }}
    NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
    NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.NEXT_PUBLIC_SHOPIFY_API_KEY }}
    NEXT_PUBLIC_DISABLE_FEATURE_GATES: ${{ vars.NEXT_PUBLIC_DISABLE_FEATURE_GATES }}
```

---

### **Step 4: Azure Static Web Appsに追加**

```
Azure Portal 
→ Static Web Apps 
→ Configuration 
→ Application settings

# サーバーサイドでのみ使う変数
Name: SHOPIFY_ADMIN_API_KEY
Value: shpat_xxxxxxxxxxxxx

Name: DATABASE_URL
Value: postgresql://...
```

---

### **Step 5: `.env.example` を更新**

```bash
# frontend/.env.example に追加
NEXT_PUBLIC_NEW_VARIABLE=example_value
```

---

### **Step 6: ドキュメントを更新**

このガイドまたは `QUICK-REFERENCE.md` に新しい環境変数を記載してください。

---

## 🚨 よくある間違い

### **❌ 間違い1: NEXT_PUBLIC_* をAzureにも設定**

```
不要な重複設定
GitHub Workflow: NEXT_PUBLIC_API_URL ✅
Azure: NEXT_PUBLIC_API_URL ❌（無意味）
```

**理由**: ビルド時に既に埋め込まれているため、Azureで設定しても反映されない

**症状**: 環境変数を変更しても反映されない

**解決策**: GitHub Variablesを変更して再デプロイ

---

### **❌ 間違い2: 秘密情報を NEXT_PUBLIC_* で設定**

```typescript
// 危険！ブラウザで丸見え
const adminKey = process.env.NEXT_PUBLIC_SHOPIFY_ADMIN_API_KEY;
```

**リスク**: 
- ブラウザの開発者ツールで誰でも見られる
- ソースコードに埋め込まれる
- 悪意のあるユーザーに悪用される可能性

**解決策**: プレフィックスを外してサーバーサイド専用にする

---

### **❌ 間違い3: サーバーサイド変数をクライアントで使おうとする**

```typescript
// frontend/src/components/MyComponent.tsx
const dbUrl = process.env.DATABASE_URL; // undefined!
```

**症状**: 環境変数が `undefined` になる

**解決策**: API Routesを経由してデータを取得

```typescript
// frontend/src/app/api/data/route.ts
export async function GET() {
  const dbUrl = process.env.DATABASE_URL; // OK
  // データベース処理...
  return Response.json({ data });
}

// frontend/src/components/MyComponent.tsx
const response = await fetch('/api/data');
const { data } = await response.json();
```

---

### **❌ 間違い4: 環境変数を変更したのに反映されない**

**原因**: `NEXT_PUBLIC_*` 変数はビルド時に埋め込まれるため

**解決策**: 
1. GitHub Variablesを変更
2. **再デプロイを実行**（必須）
3. ブラウザのキャッシュをクリア

---

## 📚 実装例：正しい使い分け

### **クライアント側の実装**

```typescript
// frontend/src/lib/api-client.ts
export class ApiClient {
  private baseUrl: string;

  constructor() {
    // ✅ ビルド時に埋め込まれた値を使用
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    if (!this.baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is not defined');
    }
  }

  async fetchProducts() {
    const response = await fetch(`${this.baseUrl}/api/products`);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return response.json();
  }
}
```

---

### **サーバーサイドの実装**

```typescript
// frontend/src/app/api/shopify/products/route.ts
export async function GET() {
  // ✅ ランタイムでAzureから取得
  const adminKey = process.env.SHOPIFY_ADMIN_API_KEY;
  
  if (!adminKey) {
    return Response.json(
      { error: 'SHOPIFY_ADMIN_API_KEY is not configured' },
      { status: 500 }
    );
  }
  
  const response = await fetch('https://admin.shopify.com/api/products', {
    headers: {
      'X-Shopify-Access-Token': adminKey
    }
  });
  
  return Response.json(await response.json());
}
```

---

### **環境別の設定**

```typescript
// frontend/src/lib/config.ts
export const config = {
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7177',
  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isDevelopment: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
  
  // 機能フラグ
  features: {
    disableGates: process.env.NEXT_PUBLIC_DISABLE_FEATURE_GATES === 'true',
  },
};
```

---

## 🔄 環境変数の変更フロー

### **`NEXT_PUBLIC_*` 変数を変更する場合**

1. **GitHub Variables を更新**
   - Settings → Secrets and variables → Actions → Variables

2. **再デプロイを実行**（必須）
   - Actions → Frontend Deploy → Run workflow

3. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+Delete

4. **動作確認**

**所要時間**: 約20分（ビルド + デプロイ）

---

### **サーバーサイド変数を変更する場合**

1. **Azure Portal で更新**
   - Static Web Apps → Configuration → Application settings

2. **保存**
   - 自動的に再起動される

3. **動作確認**

**所要時間**: 約1-2分（再起動のみ）

---

## 🧪 環境変数のテスト方法

### **ローカル開発環境**

```bash
# frontend/.env.local を作成
NEXT_PUBLIC_API_URL=http://localhost:7177
NEXT_PUBLIC_SHOPIFY_API_KEY=test_key
NEXT_PUBLIC_DISABLE_FEATURE_GATES=true

# 開発サーバー起動
npm run dev
```

### **ビルド時の確認**

```bash
# ビルド実行
npm run build

# ビルドログで環境変数を確認
# "Using NEXT_PUBLIC_ENVIRONMENT: development" などが表示される
```

### **デプロイ後の確認**

```javascript
// ブラウザのコンソールで確認
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Environment:', process.env.NEXT_PUBLIC_ENVIRONMENT);
```

---

## 📖 関連ドキュメント

- [Azure Static Web Apps 環境変数設定](./azure-static-web-apps-environment-variables.md)
- [開発環境セットアップガイド](../../01-環境構築/開発環境セットアップガイド.md)
- [QUICK-REFERENCE.md](../../../QUICK-REFERENCE.md)
- [Next.js Environment Variables (公式)](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## 🆘 トラブルシューティング

### **問題: 環境変数が `undefined` になる**

**チェック項目:**
1. 変数名が正しいか？（タイポ確認）
2. `NEXT_PUBLIC_` プレフィックスが必要か？
3. GitHub Workflow に追加されているか？
4. 再デプロイを実行したか？

---

### **問題: 機能ロックが解除されない**

**原因**: `NEXT_PUBLIC_DISABLE_FEATURE_GATES` がビルド時に渡されていない

**解決策:**
1. GitHub Workflow に変数を追加
2. GitHub Variables に `NEXT_PUBLIC_DISABLE_FEATURE_GATES=true` を設定
3. 再デプロイを実行

**参考**: [機能ロック解除の詳細](../../../06-shopify/02-課金システム/README.md)

---

### **問題: セキュリティ警告が出る**

**原因**: 秘密情報を `NEXT_PUBLIC_*` で設定している

**解決策:**
1. プレフィックスを削除
2. Azure Static Web Apps に移動
3. API Routes経由でアクセス

---

## 📝 チェックリスト：環境変数追加時

新しい環境変数を追加する際は、以下をチェックしてください：

- [ ] 変数の種類を判定（クライアント側 or サーバー側）
- [ ] セキュリティレベルを確認（公開可能 or 秘密）
- [ ] 適切なプレフィックスを選択（`NEXT_PUBLIC_*` or なし）
- [ ] GitHub Secrets/Variables に登録
- [ ] GitHub Workflow に追加（必要な場合）
- [ ] Azure Portal に追加（必要な場合）
- [ ] `.env.example` を更新
- [ ] このドキュメントを更新
- [ ] ローカルでテスト
- [ ] デプロイ後に動作確認

---

## 更新履歴

- **2025-10-23**: 初版作成（福田 + AI Assistant）
  - Azure Static Web Apps と GitHub Workflow の環境変数の仕組みを体系化
  - セキュリティベストプラクティスを追加
  - 実装例とトラブルシューティングを追加

