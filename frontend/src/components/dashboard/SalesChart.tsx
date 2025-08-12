import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesChartProps {
  data: SalesChartData[];
  chartType?: 'line' | 'area';
}

export function SalesChart({ data, chartType = 'area' }: SalesChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    }),
  }));

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `¥${(value / 1000).toFixed(0)}k`;
    }
    return `¥${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <span 
                className="text-xs font-medium"
                style={{ color: entry.color }}
              >
                {entry.name === 'revenue' ? '売上' : '注文数'}:
              </span>
              <span className="text-xs font-bold text-gray-900">
                {entry.name === 'revenue' 
                  ? new Intl.NumberFormat('ja-JP', { 
                      style: 'currency', 
                      currency: 'JPY',
                      minimumFractionDigits: 0,
                    }).format(entry.value)
                  : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left"
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => value === 'revenue' ? '売上' : '注文数'}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis 
          yAxisId="left"
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
          formatter={(value) => value === 'revenue' ? '売上' : '注文数'}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorOrders)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}