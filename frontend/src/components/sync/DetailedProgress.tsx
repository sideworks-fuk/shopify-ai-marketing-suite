import React, { useMemo } from 'react';
import {
  Card,
  ProgressBar,
  Text,
  Badge,
  InlineStack,
  BlockStack,
  Icon,
  Button,
  Divider,
} from '@shopify/polaris';
import {
  ClockIcon,
  CalendarIcon,
  RefreshIcon,
  PauseCircleIcon,
  PlayIcon,
  CheckCircleIcon,
} from '@shopify/polaris-icons';

interface DetailedProgressProps {
  currentProgress: number;
  totalRecords: number;
  processedRecords: number;
  startDate: Date;
  endDate: Date;
  estimatedCompletion: Date;
  canResume: boolean;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  syncSpeed?: number; // records per second
  errors?: number;
  warnings?: number;
}

const DetailedProgress: React.FC<DetailedProgressProps> = ({
  currentProgress,
  totalRecords,
  processedRecords,
  startDate,
  endDate,
  estimatedCompletion,
  canResume,
  isPaused = false,
  onPause,
  onResume,
  syncSpeed = 0,
  errors = 0,
  warnings = 0,
}) => {
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTimeRemaining = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '完了済み';
    }

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `残り約${days}日${hours % 24}時間`;
    } else if (hours > 0) {
      return `残り約${hours}時間${minutes % 60}分`;
    } else {
      return `残り約${minutes}分`;
    }
  };

  const progressTone = useMemo(() => {
    if (currentProgress === 100) return 'success';
    if (isPaused) return 'attention';
    if (errors > 0) return 'critical';
    if (warnings > 0) return 'warning';
    return 'info';
  }, [currentProgress, isPaused, errors, warnings]);

  const statusBadge = useMemo(() => {
    if (currentProgress === 100) {
      return <Badge tone="success">完了</Badge>;
    }
    if (isPaused) {
      return <Badge tone="attention">一時停止中</Badge>;
    }
    if (errors > 0) {
      return <Badge tone="critical">エラーあり</Badge>;
    }
    return <Badge tone="info">同期中</Badge>;
  }, [currentProgress, isPaused, errors]);

  const formatSpeed = (speed: number): string => {
    if (speed < 1) {
      return `${(speed * 60).toFixed(0)} 件/分`;
    }
    return `${speed.toFixed(1)} 件/秒`;
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            同期進捗状況
          </Text>
          {statusBadge}
        </InlineStack>

        {/* Progress Bar */}
        <BlockStack gap="200">
          <ProgressBar
            progress={currentProgress}
            size="medium"
          />
          <InlineStack align="space-between">
            <Text as="span" variant="bodySm" tone="subdued">
              {processedRecords.toLocaleString()} / {totalRecords.toLocaleString()} 件
            </Text>
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {currentProgress.toFixed(1)}%
            </Text>
          </InlineStack>
        </BlockStack>

        <Divider />

        {/* Data Range */}
        <BlockStack gap="300">
          <InlineStack gap="100" blockAlign="center">
            <Icon source={CalendarIcon} />
            <Text as="h4" variant="headingSm">
              データ取得範囲
            </Text>
          </InlineStack>
          
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  開始日
                </Text>
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  {formatDate(startDate)}
                </Text>
              </BlockStack>
              
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  終了日
                </Text>
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  {formatDate(endDate)}
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </BlockStack>

        <Divider />

        {/* Performance Metrics */}
        <BlockStack gap="300">
          <InlineStack gap="100" blockAlign="center">
            <Icon source={ClockIcon} />
            <Text as="h4" variant="headingSm">
              パフォーマンス
            </Text>
          </InlineStack>

          <InlineStack gap="400">
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                処理速度
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {formatSpeed(syncSpeed)}
              </Text>
            </BlockStack>

            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                推定完了時刻
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {formatDateTime(estimatedCompletion)}
              </Text>
            </BlockStack>

            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">
                残り時間
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {formatTimeRemaining(estimatedCompletion)}
              </Text>
            </BlockStack>
          </InlineStack>
        </BlockStack>

        {/* Error and Warning Counts */}
        {(errors > 0 || warnings > 0) && (
          <>
            <Divider />
            <InlineStack gap="400">
              {errors > 0 && (
                <Badge tone="critical">{`エラー: ${errors}件`}</Badge>
              )}
              {warnings > 0 && (
                <Badge tone="warning">{`警告: ${warnings}件`}</Badge>
              )}
            </InlineStack>
          </>
        )}

        {/* Control Buttons */}
        <Divider />
        <InlineStack gap="200">
          {currentProgress < 100 && (
            <>
              {!isPaused && onPause && (
                <Button
                  icon={PauseCircleIcon}
                  onClick={onPause}
                  tone="critical"
                >
                  一時停止
                </Button>
              )}
              
              {isPaused && onResume && (
                <Button
                  icon={PlayIcon}
                  onClick={onResume}
                  variant="primary"
                >
                  再開
                </Button>
              )}
            </>
          )}

          {canResume && isPaused && (
            <Badge tone="success">再開可能</Badge>
          )}

          {currentProgress === 100 && (
            <Badge tone="success">同期完了</Badge>
          )}
        </InlineStack>

        {/* Resume Information */}
        {canResume && isPaused && (
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="100" blockAlign="center">
                <Icon source={RefreshIcon} />
                <Text as="h4" variant="headingSm">
                  再開情報
                </Text>
              </InlineStack>
              <Text as="p" variant="bodySm">
                同期は安全に一時停止されました。「再開」ボタンをクリックすると、
                中断した地点（{processedRecords.toLocaleString()}件目）から処理を継続します。
                データの重複や欠損は発生しません。
              </Text>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Card>
  );
};

export default DetailedProgress;