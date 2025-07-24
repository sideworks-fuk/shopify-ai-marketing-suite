import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  // 静的エクスポートに対応するため、サーバーサイドリダイレクトを使用
  redirect("/dev-bookmarks")

  // 以下のコードは実行されませんが、型エラーを避けるために残します
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          📊 Shopify ECマーケティング分析スイート
        </h1>
        <p className="text-gray-600 mt-2">
          売上・購買・顧客分析の統合プラットフォーム
        </p>
      </div>

      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              📊 売上分析
              <Badge variant="secondary">5機能</Badge>
            </CardTitle>
            <CardDescription>
              売上・商品の深堀り分析
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 売上ダッシュボード</li>
              <li>• 前年同月比【商品】</li>
              <li>• 購入頻度【商品】</li>
              <li>• 組み合わせ商品【商品】</li>
              <li>• 月別売上統計【購買】</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🛍️ 購買分析
              <Badge variant="secondary">2機能</Badge>
            </CardTitle>
            <CardDescription>
              購買行動の深層分析
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 購入回数【購買】</li>
              <li>• F階層傾向【購買】</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              👥 顧客分析
              <Badge variant="secondary">3機能</Badge>
            </CardTitle>
            <CardDescription>
              顧客セグメント詳細分析
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 顧客ダッシュボード</li>
              <li>• 顧客購買【顧客】</li>
              <li>• 休眠顧客【顧客】</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🤖 AIインサイト
              <Badge variant="secondary">1機能</Badge>
            </CardTitle>
            <CardDescription>
              AI予測・提案システム
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• AI分析・提案</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 機能実装状況 */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 機能実装状況</CardTitle>
          <CardDescription>
            各機能の実装・開発状況を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-700 mb-2">✅ 実装済み (10機能)</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• 売上ダッシュボード</li>
                  <li>• 前年同月比【商品】</li>
                  <li>• 購入頻度【商品】</li>
                  <li>• 組み合わせ商品【商品】</li>
                  <li>• 月別売上統計【購買】</li>
                  <li>• 購入回数【購買】</li>
                  <li>• F階層傾向【購買】</li>
                  <li>• 顧客ダッシュボード</li>
                  <li>• 顧客購買【顧客】</li>
                  <li>• 休眠顧客【顧客】</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-orange-700 mb-2">🚧 実装予定 (1機能)</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• AIインサイト</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 <strong>左側のナビゲーションメニュー</strong>から各機能にアクセスできます。
                実装済みの機能はクリックして利用でき、実装予定の機能には「実装予定」バッジが表示されます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
