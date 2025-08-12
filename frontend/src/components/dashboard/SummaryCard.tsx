import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: number;
  change: number;
  format: 'currency' | 'number' | 'percent';
  icon?: React.ReactNode;
}

export function SummaryCard({ title, value, change, format, icon }: SummaryCardProps) {
  const formatValue = (val: number, type: string) => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('ja-JP', { 
          style: 'currency', 
          currency: 'JPY',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val.toFixed(2)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('ja-JP').format(val);
    }
  };

  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
  const ChangeIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(value, format)}
        </div>
        <div className={`flex items-center mt-2 ${changeColor}`}>
          <div className={`flex items-center px-2 py-1 rounded-full ${bgColor}`}>
            <ChangeIcon className="h-3 w-3 mr-1" />
            <span className="text-xs font-medium">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-gray-500 ml-2">前期比</span>
        </div>
      </CardContent>
    </Card>
  );
}