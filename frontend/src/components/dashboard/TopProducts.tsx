import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  revenue: number;
  units: number;
  trend: number;
}

interface TopProductsProps {
  products: Product[];
}

export function TopProducts({ products }: TopProductsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    } else if (trend < 0) {
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
        >
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">
                  {index + 1}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {product.name}
              </p>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-gray-500">
                  {product.units} 個
                </span>
                <div className={`flex items-center space-x-1 ${getTrendColor(product.trend)}`}>
                  {getTrendIcon(product.trend)}
                  <span className="text-xs font-medium">
                    {Math.abs(product.trend).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(product.revenue)}
            </p>
          </div>
        </div>
      ))}
      
      {products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">商品データがありません</p>
        </div>
      )}
    </div>
  );
}