# PURCH-02-COUNT 購入回数分析【購買】シンプル版実装ガイド

## 📌 実装概要

### 実装方針
- **オプション1**: 既存の実装済みコードをベースにした5階層シンプル版
- **実装パターン**: YUKIさんの「条件設定→分析実行」パターンを採用
- **データ構造**: 既存のOrdersテーブルを活用（新規テーブル作成不要）

### 主要変更点
1. 購入回数を5階層に簡素化（1回、2回、3-5回、6-10回、11回以上）
2. 条件設定エリアの追加による明示的な分析実行
3. スケルトンローダーによる段階的読み込み

## 🎯 実装タスク

### 1. フロントエンド実装

#### 1.1 ページコンポーネントの作成
**ファイル**: `frontend/src/app/purchase/count-analysis/page.tsx`

```tsx
"use client"

import { useState } from "react"
import PurchaseCountAnalysis from "@/components/dashboards/PurchaseCountAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"
import { AnalysisDescriptionCard } from "@/components/common/AnalysisDescriptionCard"
import { PurchaseCountConditionPanel } from "@/components/purchase/PurchaseCountConditionPanel"
import { Button } from "@/components/ui/button"

export default function PurchaseCountAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisConditions, setAnalysisConditions] = useState(null)

  const headerConfig = {
    mainTitle: "購入回数分析【購買】",
    description: "顧客の購入回数パターンを5段階で分析し、リピート促進施策の立案を支援します",
    currentAnalysis: {
      title: "購入回数別顧客分析",
      description: "購入回数を5段階に分類し、各層の顧客動向と売上貢献を可視化します",
      targetCount: 0 // 条件設定後に更新
    },
    badges: [
      { label: "5階層分析", variant: "outline" as const },
      { label: "シンプル版", variant: "secondary" as const }
    ]
  }

  const handleAnalysisExecute = (conditions) => {
    setAnalysisConditions(conditions)
    setIsAnalyzing(true)
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeaderUnified {...headerConfig} />
      
      <AnalysisDescriptionCard 
        title="購入回数分析の活用法"
        description="購入回数による顧客分類を把握し、リピート購入促進施策の効果測定にご活用ください。"
        variant="purpose"
      />

      {/* 条件設定パネル */}
      <PurchaseCountConditionPanel 
        onExecute={handleAnalysisExecute}
        isAnalyzing={isAnalyzing}
      />

      {/* 分析結果表示 */}
      {analysisConditions && (
        <PurchaseCountAnalysis 
          conditions={analysisConditions}
          onAnalysisComplete={() => setIsAnalyzing(false)}
        />
      )}
    </div>
  )
}
```

#### 1.2 条件設定パネルコンポーネント
**ファイル**: `frontend/src/components/purchase/PurchaseCountConditionPanel.tsx`

```tsx
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CalendarIcon, PlayIcon } from "lucide-react"

interface PurchaseCountConditionPanelProps {
  onExecute: (conditions: AnalysisConditions) => void
  isAnalyzing: boolean
}

export function PurchaseCountConditionPanel({ 
  onExecute, 
  isAnalyzing 
}: PurchaseCountConditionPanelProps) {
  const [period, setPeriod] = useState("12months")
  const [segment, setSegment] = useState("all")
  const [compareWithPrevious, setCompareWithPrevious] = useState(true)

  const handleExecute = () => {
    onExecute({
      period,
      segment,
      compareWithPrevious,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>分析条件設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 分析期間 */}
          <div className="space-y-2">
            <Label>分析期間</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">過去3ヶ月</SelectItem>
                <SelectItem value="6months">過去6ヶ月</SelectItem>
                <SelectItem value="12months">過去12ヶ月</SelectItem>
                <SelectItem value="24months">過去24ヶ月</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 顧客セグメント */}
          <div className="space-y-2">
            <Label>顧客セグメント</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全顧客</SelectItem>
                <SelectItem value="new">新規顧客</SelectItem>
                <SelectItem value="existing">既存顧客</SelectItem>
                <SelectItem value="returning">復帰顧客</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 前年比較 */}
          <div className="space-y-2">
            <Label>前年同期比較</Label>
            <Select 
              value={compareWithPrevious ? "yes" : "no"} 
              onValueChange={(v) => setCompareWithPrevious(v === "yes")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">比較する</SelectItem>
                <SelectItem value="no">比較しない</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleExecute}
            disabled={isAnalyzing}
            size="lg"
            className="min-w-[120px]"
          >
            {isAnalyzing ? (
              <>分析中...</>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                分析実行
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 1.3 分析結果表示コンポーネントの修正
**ファイル**: `frontend/src/components/dashboards/PurchaseCountAnalysis.tsx`

主な修正点:
1. 5階層表示への対応
2. スケルトンローダーの実装
3. 条件設定に基づくデータ取得

```tsx
// 購入回数の5階層定義
const PURCHASE_TIERS = [
  { count: 1, label: "1回", color: "#e3f2fd" },
  { count: 2, label: "2回", color: "#bbdefb" },
  { count: "3-5", label: "3-5回", color: "#90caf9" },
  { count: "6-10", label: "6-10回", color: "#64b5f6" },
  { count: "11+", label: "11回以上", color: "#2196f3" }
]

// データ取得時のパラメータ設定
const fetchAnalysisData = async (conditions: AnalysisConditions) => {
  const params = new URLSearchParams({
    storeId: "1",
    period: conditions.period,
    segment: conditions.segment,
    includeComparison: conditions.compareWithPrevious.toString(),
    tierMode: "simplified" // 5階層モードを指定
  })
  
  const response = await fetch(`/api/purchase/count-analysis?${params}`)
  return response.json()
}
```

### 2. バックエンド実装

#### 2.1 APIエンドポイントの修正
**ファイル**: `backend/ShopifyAnalyticsApi/Controllers/PurchaseController.cs`

```csharp
[HttpGet("count-analysis")]
public async Task<IActionResult> GetPurchaseCountAnalysis(
    [FromQuery] PurchaseCountAnalysisRequest request)
{
    try
    {
        // tierModeパラメータの追加
        if (request.TierMode == "simplified")
        {
            var simplifiedResponse = await _purchaseCountService
                .GetSimplifiedPurchaseCountAnalysisAsync(request);
            
            return Ok(new ApiResponse<PurchaseCountAnalysisResponse>
            {
                Success = true,
                Data = simplifiedResponse
            });
        }
        
        // 既存の詳細分析
        var response = await _purchaseCountService
            .GetPurchaseCountAnalysisAsync(request);
        
        return Ok(new ApiResponse<PurchaseCountAnalysisResponse>
        {
            Success = true,
            Data = response
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "購入回数分析でエラーが発生しました");
        return StatusCode(500, new ApiResponse<object>
        {
            Success = false,
            Error = "分析処理中にエラーが発生しました"
        });
    }
}
```

#### 2.2 サービス層の修正
**ファイル**: `backend/ShopifyAnalyticsApi/Services/PurchaseCountAnalysisService.cs`

```csharp
public async Task<PurchaseCountAnalysisResponse> GetSimplifiedPurchaseCountAnalysisAsync(
    PurchaseCountAnalysisRequest request)
{
    using var performanceScope = _logger.BeginPerformanceScope("簡易購入回数分析");
    
    // 期間の計算
    var (startDate, endDate) = CalculateDateRange(request.Period);
    
    // 5階層でのデータ集計
    var simplifiedData = await GetSimplifiedPurchaseCountDataAsync(
        request.StoreId, startDate, endDate, request.Segment);
    
    // レスポンスの構築
    var response = new PurchaseCountAnalysisResponse
    {
        Summary = CalculateSummary(simplifiedData),
        Details = simplifiedData,
        Trends = await GetSimplifiedTrendsAsync(request.StoreId, request.Period),
        SegmentAnalysis = request.Segment == "all" 
            ? await GetSegmentAnalysisAsync(request.StoreId, startDate, endDate)
            : null,
        Insights = GenerateSimplifiedInsights(simplifiedData)
    };
    
    return response;
}

private async Task<List<PurchaseCountDetail>> GetSimplifiedPurchaseCountDataAsync(
    int storeId, DateTime startDate, DateTime endDate, string segment)
{
    // 顧客ごとの購入回数を取得
    var customerPurchaseCounts = await _context.Orders
        .Where(o => o.StoreId == storeId && 
                   o.CreatedAt >= startDate && 
                   o.CreatedAt <= endDate)
        .GroupBy(o => o.CustomerId)
        .Select(g => new 
        { 
            CustomerId = g.Key,
            PurchaseCount = g.Count(),
            TotalAmount = g.Sum(o => o.TotalPrice),
            OrderCount = g.Count()
        })
        .ToListAsync();
    
    // 5階層にグループ化
    var tierGroups = new Dictionary<string, PurchaseCountDetail>
    {
        ["1"] = CreateTierDetail(1, "1回"),
        ["2"] = CreateTierDetail(2, "2回"),
        ["3-5"] = CreateTierDetail(3, "3-5回"),
        ["6-10"] = CreateTierDetail(6, "6-10回"),
        ["11+"] = CreateTierDetail(11, "11回以上")
    };
    
    // 各顧客を適切な階層に分類
    foreach (var customer in customerPurchaseCounts)
    {
        var tierKey = GetTierKey(customer.PurchaseCount);
        var tier = tierGroups[tierKey];
        
        tier.Current.CustomerCount++;
        tier.Current.OrderCount += customer.OrderCount;
        tier.Current.TotalAmount += customer.TotalAmount;
    }
    
    // 平均値とパーセンテージを計算
    var totalCustomers = customerPurchaseCounts.Count;
    var totalAmount = customerPurchaseCounts.Sum(c => c.TotalAmount);
    
    foreach (var tier in tierGroups.Values)
    {
        if (tier.Current.CustomerCount > 0)
        {
            tier.Current.AverageOrderValue = 
                tier.Current.TotalAmount / tier.Current.OrderCount;
            tier.Current.AverageCustomerValue = 
                tier.Current.TotalAmount / tier.Current.CustomerCount;
        }
        
        tier.Percentage = new PercentageMetrics
        {
            CustomerPercentage = totalCustomers > 0 
                ? (decimal)tier.Current.CustomerCount / totalCustomers * 100 : 0,
            AmountPercentage = totalAmount > 0 
                ? tier.Current.TotalAmount / totalAmount * 100 : 0
        };
    }
    
    return tierGroups.Values.OrderBy(t => t.PurchaseCount).ToList();
}

private string GetTierKey(int purchaseCount)
{
    return purchaseCount switch
    {
        1 => "1",
        2 => "2",
        >= 3 and <= 5 => "3-5",
        >= 6 and <= 10 => "6-10",
        >= 11 => "11+",
        _ => "1"
    };
}
```

### 3. パフォーマンス最適化

#### 3.1 インデックスの確認
```sql
-- 既存のインデックスを活用
-- Orders.StoreId, Orders.CustomerId, Orders.CreatedAt
-- これらのインデックスは既に存在するため、追加作成は不要
```

#### 3.2 キャッシュ実装
```csharp
// MemoryCacheを使用した結果キャッシュ
private readonly IMemoryCache _cache;

public async Task<PurchaseCountAnalysisResponse> GetSimplifiedPurchaseCountAnalysisAsync(
    PurchaseCountAnalysisRequest request)
{
    var cacheKey = $"purchase_count_simplified_{request.StoreId}_{request.Period}_{request.Segment}";
    
    if (_cache.TryGetValue(cacheKey, out PurchaseCountAnalysisResponse cachedResponse))
    {
        _logger.LogInformation("キャッシュから購入回数分析データを取得");
        return cachedResponse;
    }
    
    // ... 分析処理 ...
    
    // 結果をキャッシュ（1時間）
    _cache.Set(cacheKey, response, TimeSpan.FromHours(1));
    
    return response;
}
```

## 📊 実装チェックリスト

### フロントエンド
- [ ] ページコンポーネント作成 (`purchase/count-analysis/page.tsx`)
- [ ] 条件設定パネルコンポーネント作成
- [ ] 既存のPurchaseCountAnalysisコンポーネント修正
- [ ] スケルトンローダー実装
- [ ] 5階層表示対応

### バックエンド
- [ ] APIエンドポイントにtierModeパラメータ追加
- [ ] GetSimplifiedPurchaseCountAnalysisAsyncメソッド実装
- [ ] 5階層グループ化ロジック実装
- [ ] キャッシュ実装
- [ ] エラーハンドリング強化

### テスト
- [ ] APIテストファイルに簡易版テスト追加
- [ ] フロントエンドの動作確認
- [ ] パフォーマンス測定

## 🎯 実装優先順位

1. **バックエンドAPI修正** (2時間)
   - tierModeパラメータ対応
   - 5階層集計ロジック実装

2. **フロントエンド基本実装** (3時間)
   - ページコンポーネント作成
   - 条件設定パネル実装

3. **統合テスト** (1時間)
   - エンドツーエンドの動作確認
   - パフォーマンス確認

## 📝 注意事項

1. **既存コードの活用**
   - 新規テーブル作成は不要
   - 既存のPurchaseCountAnalysisServiceを拡張

2. **YUKIさんパターンの踏襲**
   - 条件設定→分析実行の2段階UI
   - スケルトンローダーによるUX向上

3. **シンプルさの維持**
   - 5階層に限定した表示
   - 複雑な分析は将来の拡張として保留

---

**作成者**: ケンジ (AI Review Assistant)  
**作成日**: 2025-07-27  
**対象者**: TAKASHIさん  
**想定工数**: 6時間