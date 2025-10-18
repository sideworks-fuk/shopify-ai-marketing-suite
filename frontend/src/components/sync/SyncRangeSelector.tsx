import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Text,
  Badge,
  Checkbox,
  InlineStack,
  BlockStack,
  Icon,
  Banner,
  Button,
  TextField,
} from '@shopify/polaris';
import {
  CalendarIcon,
  AlertCircleIcon,
  InfoIcon,
} from '@shopify/polaris-icons';

export interface SyncRange {
  type: 'years' | 'all' | 'custom';
  value: number;
  includeArchived: boolean;
  startDate?: Date;
  endDate?: Date;
}

interface SyncRangeSelectorProps {
  defaultRange?: number;
  onRangeChange: (range: SyncRange) => void;
  showEstimates?: boolean;
  includeArchived?: boolean;
  estimatedRecords?: number;
  estimatedTime?: number; // in minutes
}

const SyncRangeSelector: React.FC<SyncRangeSelectorProps> = ({
  defaultRange = 3,
  onRangeChange,
  showEstimates = true,
  includeArchived: initialIncludeArchived = false,
  estimatedRecords = 0,
  estimatedTime = 0,
}) => {
  const [selectedRange, setSelectedRange] = useState<string>(defaultRange.toString());
  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived);
  const [customYears, setCustomYears] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const rangeOptions = [
    { label: '過去1年', value: '1' },
    { label: '過去2年', value: '2' },
    { label: '過去3年（推奨）', value: '3' },
    { label: '過去5年', value: '5' },
    { label: '全期間', value: 'all' },
    { label: 'カスタム', value: 'custom' },
  ];

  useEffect(() => {
    const range: SyncRange = {
      type: selectedRange === 'all' ? 'all' : selectedRange === 'custom' ? 'custom' : 'years',
      value: selectedRange === 'all' ? 0 : selectedRange === 'custom' ? parseInt(customYears) || 0 : parseInt(selectedRange),
      includeArchived,
    };

    if (selectedRange === 'custom' && customYears) {
      const years = parseInt(customYears);
      if (years > 0) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - years);
        range.startDate = startDate;
        range.endDate = endDate;
      }
    }

    onRangeChange(range);
  }, [selectedRange, includeArchived, customYears, onRangeChange]);

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    setShowCustomInput(value === 'custom');
    if (value !== 'custom') {
      setCustomYears('');
    }
  };

  const formatEstimatedTime = (minutes: number): string => {
    if (minutes < 60) {
      return `約${minutes}分`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60);
      return `約${hours}時間`;
    } else {
      const days = Math.round(minutes / 1440);
      return `約${days}日`;
    }
  };

  const getWarningMessage = (): string | null => {
    if (selectedRange === 'all') {
      return '全期間のデータ同期は時間がかかる場合があります。';
    }
    if (selectedRange === 'custom' && parseInt(customYears) > 5) {
      return '5年以上のデータ同期は処理時間が長くなる可能性があります。';
    }
    if (estimatedRecords > 100000) {
      return '大量のデータが含まれています。同期には時間がかかる可能性があります。';
    }
    return null;
  };

  const warningMessage = getWarningMessage();

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            データ同期範囲の選択
          </Text>
          <Badge tone="info">期間設定</Badge>
        </InlineStack>

        <BlockStack gap="300">
          <Select
            label="同期する期間"
            options={rangeOptions}
            value={selectedRange}
            onChange={handleRangeChange}
            helpText={selectedRange === '3' ? '推奨設定：過去3年間のデータは分析に最適なバランスです' : undefined}
          />

          {showCustomInput && (
            <TextField
              label="カスタム年数"
              type="number"
              value={customYears}
              onChange={setCustomYears}
              placeholder="例: 4"
              suffix="年"
              min={1}
              autoComplete="off"
              helpText="同期したい年数を入力してください"
            />
          )}

          <Checkbox
            label="アーカイブされたデータを含める"
            checked={includeArchived}
            onChange={setIncludeArchived}
            helpText="削除された商品や無効化された顧客データも同期します"
          />
        </BlockStack>

        {showEstimates && (estimatedRecords > 0 || estimatedTime > 0) && (
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="100" blockAlign="center">
                <Icon source={InfoIcon} />
                <Text as="h4" variant="headingSm">
                  推定値
                </Text>
              </InlineStack>
              
              <InlineStack gap="400">
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    レコード数
                  </Text>
                  <Text as="span" variant="bodyLg" fontWeight="semibold">
                    {estimatedRecords.toLocaleString()}件
                  </Text>
                </BlockStack>
                
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    処理時間
                  </Text>
                  <Text as="span" variant="bodyLg" fontWeight="semibold">
                    {formatEstimatedTime(estimatedTime)}
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {warningMessage && (
          <Banner
            tone="warning"
            icon={AlertCircleIcon}
          >
            <Text as="p">{warningMessage}</Text>
          </Banner>
        )}

        {selectedRange === '3' && (
          <Banner tone="success">
            <BlockStack gap="200">
              <Text as="p" fontWeight="semibold">
                推奨設定が選択されています
              </Text>
              <Text as="p" variant="bodySm">
                過去3年間のデータは、トレンド分析と顧客行動パターンの把握に最適です。
                処理時間とデータ量のバランスが良く、効率的な分析が可能です。
              </Text>
            </BlockStack>
          </Banner>
        )}
      </BlockStack>
    </Card>
  );
};

export default SyncRangeSelector;