# 環境設定（environments.ts）

対象: `frontend/src/lib/config/environments.ts`

## 概要
- 環境（development/staging/production）に応じて API Base URL を決定し、検証・デバッグ情報を提供。

## 主な関数
- `getCurrentEnvironment()`: 実行/ビルド時情報やホスト名から環境を決定
- `getCurrentEnvironmentConfig()`: 現在環境の `EnvironmentConfig` を返す（検証込み）
- `getAvailableEnvironments()`: 利用可能環境の配列
- `setEnvironment(key) / resetEnvironment()`: 開発時に localStorage 経由で切替
- `getBuildTimeEnvironmentInfo() / getEnvironmentDebugInfo()`: デバッグ情報

## URL 解決
- 優先: `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` → ローカル既定（dev）→ 本番既定
- Azure Static Web Apps ドメイン検出で production を強制
- production で development API を拒否する検証を内蔵

## 推奨
- 本番/ステージングでは `NEXT_PUBLIC_API_URL` を正に統一し、`localhost` を排除
- フロントからの呼び出しは `buildApiUrl()`（`api-config.ts`）の利用で一貫性を維持
