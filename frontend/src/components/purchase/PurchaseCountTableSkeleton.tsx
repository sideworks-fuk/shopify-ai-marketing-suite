import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PurchaseCountTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* サマリーカードのスケルトン */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* メインカードのスケルトン */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent>
          {/* タブのスケルトン */}
          <div className="mb-4">
            <Skeleton className="h-10 w-full max-w-md" />
          </div>

          {/* テーブルのスケルトン */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 p-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>
            {[...Array(5)].map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-7 gap-2 p-2 border-t">
                {[...Array(7)].map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}