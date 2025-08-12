import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Button,
  Text,
  Divider,
} from '@shopify/polaris';
import {
  SyncRangeSelector,
  DetailedProgress,
  InitialSyncModal,
} from '../../components/sync';
import type { SyncRange, SyncConfig } from '../../components/sync';

/**
 * デモページ: 同期範囲管理UIコンポーネントのデモンストレーション
 * 
 * このページは開発中のテスト用です。
 * 実際の実装では、APIと連携してリアルタイムのデータを使用します。
 */
const SyncRangeManagementDemo: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<SyncRange>({
    type: 'years',
    value: 3,
    includeArchived: false,
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Demo data
  const totalRecords = 45000;
  const processedRecords = Math.floor((syncProgress / 100) * totalRecords);
  const syncSpeed = isPaused ? 0 : 125.5; // records per second
  
  const now = new Date();
  const startDate = new Date(now.getFullYear() - selectedRange.value, now.getMonth(), now.getDate());
  const endDate = new Date();
  const estimatedCompletion = new Date(now.getTime() + (100 - syncProgress) * 600); // 6 seconds per percent

  const handleRangeChange = (range: SyncRange) => {
    setSelectedRange(range);
    console.log('Range changed:', range);
  };

  const handleStartSync = (config: SyncConfig) => {
    console.log('Starting sync with config:', config);
    setIsSyncing(true);
    setSyncProgress(0);
    setIsPaused(false);
    
    // Simulate sync progress
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          return 100;
        }
        return prev + 2;
      });
    }, 1000);
  };

  const handlePause = () => {
    setIsPaused(true);
    console.log('Sync paused');
  };

  const handleResume = () => {
    setIsPaused(false);
    console.log('Sync resumed');
    
    // Continue simulation
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100 || isPaused) {
          clearInterval(interval);
          if (prev >= 100) setIsSyncing(false);
          return prev >= 100 ? 100 : prev;
        }
        return prev + 2;
      });
    }, 1000);
  };

  return (
    <Page
      title="同期範囲管理UIデモ"
      subtitle="新しい同期範囲管理コンポーネントのデモンストレーション"
      primaryAction={{
        content: '初回同期を開始',
        onAction: () => setIsModalOpen(true),
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            {/* Component 1: SyncRangeSelector */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  1. SyncRangeSelector コンポーネント
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  同期する期間を選択し、推定データ量と処理時間を表示します。
                </Text>
                <Divider />
                <SyncRangeSelector
                  defaultRange={3}
                  onRangeChange={handleRangeChange}
                  showEstimates={true}
                  includeArchived={false}
                  estimatedRecords={45000}
                  estimatedTime={30}
                />
              </BlockStack>
            </Card>

            {/* Component 2: DetailedProgress */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  2. DetailedProgress コンポーネント
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  同期の詳細な進捗状況、データ範囲、推定完了時間を表示します。
                </Text>
                <Divider />
                
                <BlockStack gap="200">
                  <Button
                    onClick={() => {
                      setIsSyncing(!isSyncing);
                      if (!isSyncing) {
                        setSyncProgress(35); // Start at 35% for demo
                      }
                    }}
                  >
                    {isSyncing ? '同期をリセット' : 'デモ同期を開始（35%から）'}
                  </Button>
                </BlockStack>

                <DetailedProgress
                  currentProgress={syncProgress}
                  totalRecords={totalRecords}
                  processedRecords={processedRecords}
                  startDate={startDate}
                  endDate={endDate}
                  estimatedCompletion={estimatedCompletion}
                  canResume={true}
                  isPaused={isPaused}
                  onPause={handlePause}
                  onResume={handleResume}
                  syncSpeed={syncSpeed}
                  errors={syncProgress > 50 ? 2 : 0}
                  warnings={syncProgress > 30 ? 5 : 0}
                />
              </BlockStack>
            </Card>

            {/* Component 3: InitialSyncModal */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  3. InitialSyncModal コンポーネント
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  初回同期の設定を行うモーダルダイアログです。
                  ステップごとに設定を進め、最終確認後に同期を開始します。
                </Text>
                <Divider />
                
                <Button
                  variant="primary"
                  onClick={() => setIsModalOpen(true)}
                >
                  初回同期モーダルを開く
                </Button>
              </BlockStack>
            </Card>

            {/* Implementation Notes */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  実装メモ
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    <strong>完了した機能:</strong>
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • 年数選択プリセット（1年、2年、3年推奨、5年、全期間、カスタム）
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • アーカイブデータを含むオプション
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • 推定レコード数と処理時間の表示
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • 詳細な進捗表示（パーセンテージ、速度、残り時間）
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • 一時停止/再開機能
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • ステップバイステップの初回同期設定
                  </Text>
                </BlockStack>
                
                <Divider />
                
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    <strong>次のステップ:</strong>
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • APIクライアントとの統合
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • WebSocketまたはSSEによるリアルタイム更新
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • エラーハンドリングの強化
                  </Text>
                  <Text as="p" variant="bodyMd">
                    • パフォーマンス最適化
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Initial Sync Modal */}
      <InitialSyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartSync={handleStartSync}
        estimatedRecords={45000}
        estimatedTime={30}
        isFirstSync={true}
      />
    </Page>
  );
};

export default SyncRangeManagementDemo;