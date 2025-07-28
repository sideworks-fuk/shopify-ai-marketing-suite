"use client"

import React, { useState, useEffect } from 'react'
import { yearOverYearApi } from '@/lib/api/year-over-year'
import { getCurrentStoreId } from '@/lib/api-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function YearOverYearDebugPage() {
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await yearOverYearApi.getYearOverYearAnalysis({
        storeId: getCurrentStoreId(),
        year: 2025,
        viewMode: 'sales',
        sortBy: 'growth_rate',
        sortDescending: true,
      })

      console.log('Full API Response:', response)
      setApiData(response)
      
      // Check first product's growth rates
      if (response.success && response.data?.products?.length > 0) {
        const firstProduct = response.data.products[0]
        console.log('First Product:', {
          name: firstProduct.productTitle,
          type: firstProduct.productType,
          monthlyData: firstProduct.monthlyData,
          overallGrowthRate: firstProduct.overallGrowthRate,
          averageMonthlyGrowthRate: firstProduct.averageMonthlyGrowthRate
        })
        
        // Check if all growth rates are 0
        const allZero = firstProduct.monthlyData.every((m: any) => m.growthRate === 0)
        if (allZero) {
          console.warn('⚠️ All growth rates are 0 for the first product!')
        }
      }
    } catch (err) {
      console.error('API Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Year-Over-Year API Debug</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>API Response Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
            <p>Success: {apiData?.success ? 'Yes' : 'No'}</p>
            <p>Message: {apiData?.message}</p>
            <Button onClick={fetchData} disabled={loading}>
              Refetch Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {apiData?.data?.products && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Total Products: {apiData.data.products.length}</p>
                <p>Current Year: {apiData.data.summary?.currentYear}</p>
                <p>Previous Year: {apiData.data.summary?.previousYear}</p>
                <p>Overall Growth Rate: {apiData.data.summary?.overallGrowthRate}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>First 3 Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiData.data.products.slice(0, 3).map((product: any, index: number) => (
                  <div key={index} className="border p-4 rounded">
                    <h3 className="font-bold">{product.productTitle}</h3>
                    <p className="text-sm text-gray-600">Type: {product.productType}</p>
                    <p className="text-sm">Overall Growth: {product.overallGrowthRate}%</p>
                    <p className="text-sm">Average Monthly Growth: {product.averageMonthlyGrowthRate}%</p>
                    
                    <div className="mt-2">
                      <h4 className="text-sm font-semibold">Monthly Growth Rates:</h4>
                      <div className="grid grid-cols-6 gap-2 mt-1">
                        {product.monthlyData.map((month: any) => (
                          <div key={month.month} className="text-xs">
                            <span className="font-medium">{month.month}月:</span>
                            <span className={month.growthRate > 0 ? 'text-green-600' : month.growthRate < 0 ? 'text-red-600' : 'text-gray-600'}>
                              {month.growthRate}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <h4 className="text-sm font-semibold">First 3 Months Detail:</h4>
                      {product.monthlyData.slice(0, 3).map((month: any) => (
                        <div key={month.month} className="text-xs mt-1">
                          <span>{month.month}月: </span>
                          <span>Current: {month.currentValue}, </span>
                          <span>Previous: {month.previousValue}, </span>
                          <span>Growth: {month.growthRate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {apiData && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Raw API Response (Check Console)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}