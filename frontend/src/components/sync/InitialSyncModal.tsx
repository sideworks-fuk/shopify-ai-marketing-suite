import React, { useState, useCallback } from 'react';
import {
  Modal,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  ProgressBar,
  Badge,
  Icon,
  Banner,
  List,
  Divider,
} from '@shopify/polaris';
import {
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  DatabaseIcon,
} from '@shopify/polaris-icons';
import SyncRangeSelector, { SyncRange } from './SyncRangeSelector';

export interface SyncConfig {
  range: SyncRange;
  estimatedRecords: number;
  estimatedTime: number;
  includeArchived: boolean;
}

interface InitialSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSync: (config: SyncConfig) => void;
  estimatedRecords?: number;
  estimatedTime?: number; // in minutes
  isFirstSync?: boolean;
}

type Step = 'range' | 'confirmation';

const InitialSyncModal: React.FC<InitialSyncModalProps> = ({
  isOpen,
  onClose,
  onStartSync,
  estimatedRecords: initialEstimatedRecords = 0,
  estimatedTime: initialEstimatedTime = 0,
  isFirstSync = true,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('range');
  const [syncRange, setSyncRange] = useState<SyncRange>({
    type: 'years',
    value: 3,
    includeArchived: false,
  });
  const [estimatedRecords, setEstimatedRecords] = useState(initialEstimatedRecords);
  const [estimatedTime, setEstimatedTime] = useState(initialEstimatedTime);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRangeChange = useCallback((range: SyncRange) => {
    setSyncRange(range);
    
    // Simulate estimation calculation based on range
    let records = 0;
    let time = 0;
    
    if (range.type === 'years') {
      records = range.value * 10000; // Example: 10,000 records per year
      time = range.value * 15; // Example: 15 minutes per year
    } else if (range.type === 'all') {
      records = 50000; // Example: all historical data
      time = 120; // Example: 2 hours for all data
    } else if (range.type === 'custom' && range.value) {
      records = range.value * 10000;
      time = range.value * 15;
    }
    
    if (range.includeArchived) {
      records = Math.floor(records * 1.3); // 30% more with archived
      time = Math.floor(time * 1.2); // 20% more time
    }
    
    setEstimatedRecords(records);
    setEstimatedTime(time);
  }, []);

  const handleNext = () => {
    setCurrentStep('confirmation');
  };

  const handleBack = () => {
    setCurrentStep('range');
  };

  const handleStartSync = async () => {
    setIsProcessing(true);
    
    const config: SyncConfig = {
      range: syncRange,
      estimatedRecords,
      estimatedTime,
      includeArchived: syncRange.includeArchived,
    };
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onStartSync(config);
    setIsProcessing(false);
    onClose();
  };

  const formatTime = (minutes: number): string => {
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

  const getRangeDescription = (): string => {
    if (syncRange.type === 'years') {
      return `過去${syncRange.value}年間のデータ`;
    } else if (syncRange.type === 'all') {
      return '全期間のデータ';
    } else if (syncRange.type === 'custom' && syncRange.value) {
      return `カスタム期間（${syncRange.value}年）`;
    }
    return 'データ';
  };

  const modalTitle = isFirstSync ? '初回データ同期の設定' : 'データ同期の設定';

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={modalTitle}
      primaryAction={
        currentStep === 'confirmation'
          ? {
              content: '同期を開始',
              onAction: handleStartSync,
              loading: isProcessing,
              disabled: isProcessing,
            }
          : {
              content: '次へ',
              onAction: handleNext,
            }
      }
      secondaryActions={
        currentStep === 'confirmation'
          ? [
              {
                content: '戻る',
                onAction: handleBack,
                disabled: isProcessing,
              },
            ]
          : [
              {
                content: 'キャンセル',
                onAction: onClose,
              },
            ]
      }
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Progress Indicator */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="h3" variant="headingSm">
                  設定ステップ
                </Text>
                <Badge tone={currentStep === 'confirmation' ? 'success' : 'info'}>
                  {currentStep === 'range' ? '1/2' : '2/2'}
                </Badge>
              </InlineStack>
              <ProgressBar
                progress={currentStep === 'range' ? 50 : 100}
                tone="success"
                size="small"
              />
            </BlockStack>
          </Card>

          {/* Step Content */}
          {currentStep === 'range' ? (
            <BlockStack gap="400">
              {isFirstSync && (
                <Banner tone="info" icon={InfoIcon}>
                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">
                      初回同期について
                    </Text>
                    <Text as="p" variant="bodySm">
                      これは初回のデータ同期です。Shopifyストアから顧客、商品、注文データを取得します。
                      データ量によっては時間がかかる場合があります。
                    </Text>
                  </BlockStack>
                </Banner>
              )}

              <SyncRangeSelector
                defaultRange={3}
                onRangeChange={handleRangeChange}
                showEstimates={true}
                includeArchived={syncRange.includeArchived}
                estimatedRecords={estimatedRecords}
                estimatedTime={estimatedTime}
              />

              <Card>
                <BlockStack gap="200">
                  <InlineStack gap="100" blockAlign="center">
                    <Icon source={InfoIcon} />
                    <Text as="h4" variant="headingSm">
                      同期されるデータ
                    </Text>
                  </InlineStack>
                  <List type="bullet">
                    <List.Item>顧客情報（メールアドレス、購買履歴など）</List.Item>
                    <List.Item>商品情報（価格、在庫、カテゴリなど）</List.Item>
                    <List.Item>注文情報（注文詳細、配送状況など）</List.Item>
                    {syncRange.includeArchived && (
                      <List.Item>アーカイブされたデータ</List.Item>
                    )}
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          ) : (
            <BlockStack gap="400">
              <Banner tone="warning" icon={AlertTriangleIcon}>
                <Text as="p">
                  データ同期を開始すると、処理が完了するまで中断することはできません。
                  十分な時間があることを確認してください。
                </Text>
              </Banner>

              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    同期設定の確認
                  </Text>
                  
                  <Divider />
                  
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm" tone="subdued">
                        同期範囲
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {getRangeDescription()}
                      </Text>
                    </InlineStack>

                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm" tone="subdued">
                        アーカイブデータ
                      </Text>
                      <Badge tone={syncRange.includeArchived ? 'success' : undefined}>
                        {syncRange.includeArchived ? '含む' : '含まない'}
                      </Badge>
                    </InlineStack>

                    <Divider />

                    <InlineStack gap="400">
                      <Card>
                        <BlockStack gap="100">
                          <InlineStack gap="100" blockAlign="center">
                            <Icon source={DatabaseIcon} />
                            <Text as="span" variant="bodySm" tone="subdued">
                              推定レコード数
                            </Text>
                          </InlineStack>
                          <Text as="p" variant="headingLg">
                            {estimatedRecords.toLocaleString()}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            件
                          </Text>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="100">
                          <InlineStack gap="100" blockAlign="center">
                            <Icon source={ClockIcon} />
                            <Text as="span" variant="bodySm" tone="subdued">
                              推定処理時間
                            </Text>
                          </InlineStack>
                          <Text as="p" variant="headingLg">
                            {formatTime(estimatedTime)}
                          </Text>
                        </BlockStack>
                      </Card>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack gap="100" blockAlign="center">
                    <Icon source={CheckCircleIcon} />
                    <Text as="h4" variant="headingSm">
                      同期プロセスについて
                    </Text>
                  </InlineStack>
                  <List type="bullet">
                    <List.Item>バックグラウンドで処理されます</List.Item>
                    <List.Item>進捗はリアルタイムで確認できます</List.Item>
                    <List.Item>エラーが発生した場合は自動的に再試行されます</List.Item>
                    <List.Item>同期中もアプリは通常通り使用できます</List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

export default InitialSyncModal;