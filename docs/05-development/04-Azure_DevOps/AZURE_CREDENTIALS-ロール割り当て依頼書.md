# Azure サービスプリンシパル - ロール割り当て依頼書

## 依頼概要

GitHub ActionsからAzure App Serviceへのデプロイを自動化するため、サービスプリンシパルにリソースグループへのアクセス権限を付与していただきたく、ご依頼申し上げます。

---

## 依頼内容

### 対象リソースグループ
- **リソースグループ名**: `ec-ranger-prod`
- **サブスクリプション**: （該当するサブスクリプション名）

### サービスプリンシパル情報
- **アプリ登録名**: `github-actions-ec-ranger`
  - または、Microsoft Entra ID（旧Azure Active Directory）の「アプリの登録」で作成したアプリ登録名
- **アプリケーション (クライアント) ID**: （確認後、記載してください）

### 付与するロール
- **ロール名**: **共同作成者**（Contributor）
- **スコープ**: リソースグループ `ec-ranger-prod` または サブスクリプションレベル（推奨）

---

## 設定手順（依頼先向け）

### 方法A: サブスクリプションレベルで設定（推奨）

1. **Azure Portal** → **サブスクリプション**
2. 対象のサブスクリプションを選択
3. 左メニュー → **アクセス制御 (IAM)**
4. **追加** → **ロールの割り当ての追加**
5. **ロール**タブ:
   - **共同作成者**（Contributor）を選択
6. **メンバー**タブ:
   - **+ メンバーの選択**
   - 検索ボックスに `github-actions-ec-ranger` を入力
   - 該当するサービスプリンシパルを選択
   - **選択**をクリック
7. **レビューと割り当て**をクリック

**メリット**: サブスクリプションレベルで設定すると、リソースグループにも自動的に権限が継承されます。

---

### 方法B: リソースグループレベルで設定

1. **Azure Portal** → **リソースグループ** → `ec-ranger-prod`
2. 左メニュー → **アクセス制御 (IAM)**
3. **追加** → **ロールの割り当ての追加**
4. **ロール**タブ:
   - **共同作成者**（Contributor）を選択
5. **メンバー**タブ:
   - **+ メンバーの選択**
   - 検索ボックスに `github-actions-ec-ranger` を入力
   - 該当するサービスプリンシパルを選択
   - **選択**をクリック
6. **レビューと割り当て**をクリック

---

## 確認方法

設定後、以下の方法で確認できます。

### Azure Portalでの確認
1. **リソースグループ** → `ec-ranger-prod` → **アクセス制御 (IAM)**
2. **ロールの割り当て**タブで、サービスプリンシパルが「共同作成者」として表示されていることを確認

### Azure CLIでの確認
```powershell
# サービスプリンシパルのロール割り当てを確認
az role assignment list \
  --assignee <アプリケーションID> \
  --scope /subscriptions/<サブスクリプションID>/resourceGroups/ec-ranger-prod \
  --query "[].{Role:roleDefinitionName, Scope:scope}" -o table
```

---

## 必要な権限の説明

### 共同作成者（Contributor）ロール
- **用途**: GitHub ActionsからAzure App Serviceへのデプロイ、デプロイスロットのスワップ
- **権限範囲**:
  - App Serviceのデプロイ
  - デプロイスロットの作成・管理
  - デプロイスロットのスワップ
  - アプリケーション設定の変更
  - リソースの読み取り・書き込み

**注意**: リソースの削除や、他のユーザーへのアクセス権限付与はできません。

---

## サービスプリンシパルの確認方法

サービスプリンシパルが存在しない場合、以下の手順で確認・作成できます。

### 確認手順
1. **Azure Portal** → **Microsoft Entra ID**（旧Azure Active Directory）
2. 左メニュー → **アプリの登録**
3. 検索ボックスに `github-actions-ec-ranger` を入力
4. 該当するアプリ登録を確認

### 存在しない場合
- アプリ登録が存在しない場合は、先にアプリ登録を作成する必要があります
- 作成手順: [AZURE_CREDENTIALS-設定確認とトラブルシューティング.md](./AZURE_CREDENTIALS-設定確認とトラブルシューティング.md) の「方法2: Azure Portalで手動作成（GUI）」を参照

---

## 連絡先・質問

設定に関するご質問や、サービスプリンシパルが見つからない場合は、以下までご連絡ください。

- **依頼者**: 福田大典
- **連絡先**: fukuda@jdo.jp

---

## 参考資料

- [Azure ロールの割り当て](https://docs.microsoft.com/ja-jp/azure/role-based-access-control/role-assignments-portal)
- [サービスプリンシパルの作成](https://docs.microsoft.com/ja-jp/azure/active-directory/develop/howto-create-service-principal-portal)
- [AZURE_CREDENTIALS-設定確認とトラブルシューティング.md](./AZURE_CREDENTIALS-設定確認とトラブルシューティング.md)

---

**作成日**: 2026年1月19日  
**作成者**: 福田大典  
**依頼先**: えみり 重松（ユーザー アクセス管理者）
