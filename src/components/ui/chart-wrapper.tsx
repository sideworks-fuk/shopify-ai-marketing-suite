import React, { ReactElement } from "react";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  PieChart,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  Pie,
  Area,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

// チャートの種類を定義
export type ChartType = "bar" | "line" | "pie" | "area";

// 共通のチャートデータ型
export interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

// チャート設定の共通型
interface BaseChartConfig {
  type: ChartType;
  data: ChartDataPoint[];
  width?: string | number;
  height?: number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

// 軸設定の型
interface AxisConfig {
  dataKey: string;
  tick?: boolean | object;
  tickFormatter?: (value: any) => string;
  domain?: [number | string, number | string];
  orientation?: "left" | "right";
}

// バーチャート固有の設定
interface BarChartConfig extends BaseChartConfig {
  type: "bar";
  xAxis: AxisConfig;
  yAxis?: AxisConfig;
  bars: Array<{
    dataKey: string;
    fill: string;
    name?: string;
    radius?: [number, number, number, number];
  }>;
}

// ラインチャート固有の設定
interface LineChartConfig extends BaseChartConfig {
  type: "line";
  xAxis: AxisConfig;
  yAxis?: AxisConfig;
  lines: Array<{
    dataKey: string;
    stroke: string;
    name?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  }>;
}

// パイチャート固有の設定
interface PieChartConfig extends BaseChartConfig {
  type: "pie";
  pie: {
    dataKey: string;
    nameKey: string;
    cx?: string | number;
    cy?: string | number;
    outerRadius?: number;
    colors: string[];
  };
}

// エリアチャート固有の設定
interface AreaChartConfig extends BaseChartConfig {
  type: "area";
  xAxis: AxisConfig;
  yAxis?: AxisConfig;
  areas: Array<{
    dataKey: string;
    fill: string;
    stroke?: string;
    name?: string;
  }>;
}

// 統合されたチャート設定型
export type ChartConfig = 
  | BarChartConfig 
  | LineChartConfig 
  | PieChartConfig 
  | AreaChartConfig;

// コンポーネントのProps型
interface ChartWrapperProps {
  title?: string;
  description?: string;
  config: ChartConfig;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
}

/**
 * デフォルトのツールチップフォーマッター
 */
const defaultTooltipFormatter = (value: any, name: string) => [
  typeof value === "number" ? value.toLocaleString("ja-JP") : value,
  name
];

/**
 * 汎用チャートラッパーコンポーネント
 * Rechartsの共通化とエラーハンドリングを提供
 */
export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  description,
  config,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  loading = false,
  error = null,
  emptyMessage = "データがありません",
  className = ""
}) => {
  // ローディング状態の表示
  if (loading) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div 
            className="flex items-center justify-center h-64 text-gray-500"
            style={{ height: config.height || 300 }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>チャートを読み込み中...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // エラー状態の表示
  if (error) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div 
            className="flex items-center justify-center h-64 text-red-500"
            style={{ height: config.height || 300 }}
          >
            <div className="text-center">
              <p className="font-medium">エラーが発生しました</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // データが空の場合
  if (!config.data || config.data.length === 0) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <div 
            className="flex items-center justify-center h-64 text-gray-500"
            style={{ height: config.height || 300 }}
          >
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * チャートタイプに応じたコンポーネントを描画
   */
  const renderChart = (): ReactElement => {
    const commonProps = {
      data: config.data,
      margin: config.margin || { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (config.type) {
      case "bar":
        const barConfig = config as BarChartConfig;
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={barConfig.xAxis.dataKey}
              tick={barConfig.xAxis.tick}
              tickFormatter={barConfig.xAxis.tickFormatter}
            />
            {barConfig.yAxis && (
              <YAxis 
                tick={barConfig.yAxis.tick}
                tickFormatter={barConfig.yAxis.tickFormatter}
                domain={barConfig.yAxis.domain}
                orientation={barConfig.yAxis.orientation}
              />
            )}
            {showTooltip && <Tooltip formatter={defaultTooltipFormatter} />}
            {showLegend && <Legend />}
            {barConfig.bars.map((bar, index) => (
              <Bar
                key={index}
                dataKey={bar.dataKey}
                fill={bar.fill}
                name={bar.name}
                radius={bar.radius}
              />
            ))}
          </BarChart>
        );

      case "line":
        const lineConfig = config as LineChartConfig;
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={lineConfig.xAxis.dataKey}
              tick={lineConfig.xAxis.tick}
              tickFormatter={lineConfig.xAxis.tickFormatter}
            />
            {lineConfig.yAxis && (
              <YAxis 
                tick={lineConfig.yAxis.tick}
                tickFormatter={lineConfig.yAxis.tickFormatter}
                domain={lineConfig.yAxis.domain}
                orientation={lineConfig.yAxis.orientation}
              />
            )}
            {showTooltip && <Tooltip formatter={defaultTooltipFormatter} />}
            {showLegend && <Legend />}
            {lineConfig.lines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                name={line.name}
                strokeWidth={line.strokeWidth}
                strokeDasharray={line.strokeDasharray}
              />
            ))}
          </LineChart>
        );

      case "pie":
        const pieConfig = config as PieChartConfig;
        return (
          <PieChart {...commonProps}>
            <Pie
              data={config.data}
              dataKey={pieConfig.pie.dataKey}
              nameKey={pieConfig.pie.nameKey}
              cx={pieConfig.pie.cx || "50%"}
              cy={pieConfig.pie.cy || "50%"}
              outerRadius={pieConfig.pie.outerRadius || 80}
            >
              {config.data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={pieConfig.pie.colors[index % pieConfig.pie.colors.length]}
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip formatter={defaultTooltipFormatter} />}
            {showLegend && <Legend />}
          </PieChart>
        );

      case "area":
        const areaConfig = config as AreaChartConfig;
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={areaConfig.xAxis.dataKey}
              tick={areaConfig.xAxis.tick}
              tickFormatter={areaConfig.xAxis.tickFormatter}
            />
            {areaConfig.yAxis && (
              <YAxis 
                tick={areaConfig.yAxis.tick}
                tickFormatter={areaConfig.yAxis.tickFormatter}
                domain={areaConfig.yAxis.domain}
                orientation={areaConfig.yAxis.orientation}
              />
            )}
            {showTooltip && <Tooltip formatter={defaultTooltipFormatter} />}
            {showLegend && <Legend />}
            {areaConfig.areas.map((area, index) => (
              <Area
                key={index}
                type="monotone"
                dataKey={area.dataKey}
                fill={area.fill}
                stroke={area.stroke}
                name={area.name}
              />
            ))}
          </AreaChart>
        );

      default:
        return (
          <div>
            <p>サポートされていないチャートタイプです</p>
          </div>
        );
    }
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height || 300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 