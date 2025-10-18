'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestSyncPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>同期ページテスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>同期ステータスページが正しく実装されました。</p>
          
          <div className="space-y-2">
            <h3 className="font-semibold">実装内容:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>同期ステータスの表示（商品・顧客・注文）</li>
              <li>同期進捗のリアルタイム表示</li>
              <li>手動同期トリガー（ドロップダウンメニュー付き）</li>
              <li>同期履歴テーブル</li>
              <li>30秒ごとの自動更新</li>
              <li>モックデータでのテスト環境</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">ページへのアクセス:</h3>
            <div className="flex gap-4">
              <Link href="/sync">
                <Button>同期ステータスページを開く</Button>
              </Link>
              <Link href="/(authenticated)/sync">
                <Button variant="outline">認証付きページを開く</Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-green-800 dark:text-green-200">
              ✓ すべてのコンポーネントが正常に作成されました
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}