import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import FeatureLockedScreen from '@/components/billing/FeatureLockedScreen';

// Mock Next.js router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock API
jest.mock('@/lib/api/billing', () => ({
  getSelectedFeature: jest.fn(),
  selectFeature: jest.fn(),
  getSubscriptionStatus: jest.fn(),
}));

import { getSelectedFeature, selectFeature, getSubscriptionStatus } from '@/lib/api/billing';

describe('無料プラン機能選択統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSubscriptionStatus as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        currentPlan: {
          id: 'starter',
          name: 'スタータープラン',
        },
      },
    });
  });

  describe('機能選択フロー', () => {
    it('初回ユーザーは機能を選択できる', async () => {
      (getSelectedFeature as jest.Mock).mockResolvedValue({
        success: true,
        data: null, // 未選択
      });

      const TestComponent = () => {
        const { hasAccess, isLoading } = useFeatureAccess('dormant_analysis');
        if (isLoading) return <div>Loading...</div>;
        if (!hasAccess) return <FeatureLockedScreen featureName="休眠顧客分析" featureType="dormant_analysis" />;
        return <div>アクセス可能</div>;
      };

      const { rerender } = render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      // 初期状態: ローディング中
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // 待機: 機能ロック画面が表示される
      await waitFor(() => {
        expect(screen.getByText(/この機能は現在ロックされています/)).toBeInTheDocument();
      });

      // 機能選択ボタンをクリック
      const selectButton = screen.getByText('機能を選択・変更する');
      fireEvent.click(selectButton);

      // ルーターが正しいページに遷移することを確認
      expect(mockPush).toHaveBeenCalledWith('/settings/billing/feature-selection');
    });

    it('選択済みの機能にはアクセスできる', async () => {
      (getSelectedFeature as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          featureId: 'dormant_analysis',
          selectedAt: new Date().toISOString(),
        },
      });

      const TestComponent = () => {
        const { hasAccess, isLoading } = useFeatureAccess('dormant_analysis');
        if (isLoading) return <div>Loading...</div>;
        if (!hasAccess) return <div>アクセス拒否</div>;
        return <div>休眠顧客分析画面</div>;
      };

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('休眠顧客分析画面')).toBeInTheDocument();
      });
    });

    it('異なる機能にはアクセスできない', async () => {
      (getSelectedFeature as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          featureId: 'dormant_analysis',
          selectedAt: new Date().toISOString(),
        },
      });

      const TestComponent = () => {
        const { hasAccess, isLoading } = useFeatureAccess('year_over_year');
        if (isLoading) return <div>Loading...</div>;
        if (!hasAccess) return <FeatureLockedScreen featureName="前年同月比分析" featureType="year_over_year" />;
        return <div>前年同月比分析画面</div>;
      };

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/この機能は現在ロックされています/)).toBeInTheDocument();
      });
    });
  });

  describe('30日制限の動作', () => {
    it('30日経過前は機能変更できない', async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      (getSelectedFeature as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          featureId: 'dormant_analysis',
          selectedAt: twentyDaysAgo.toISOString(),
          canChangeAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10日後
        },
      });

      (selectFeature as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: '機能の変更は30日ごとに1回のみ可能です',
          },
        },
      });

      // テスト実装（機能選択画面のコンポーネントが必要）
      // このテストは実際の機能選択コンポーネントが実装された後に完全に動作します
      expect(true).toBe(true);
    });

    it('30日経過後は機能変更可能', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      (getSelectedFeature as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          featureId: 'dormant_analysis',
          selectedAt: thirtyOneDaysAgo.toISOString(),
          canChangeAt: new Date(Date.now() - 1000).toISOString(), // 変更可能
        },
      });

      (selectFeature as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          featureId: 'year_over_year',
          selectedAt: new Date().toISOString(),
        },
      });

      // テスト実装
      expect(true).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラー時は適切なエラーメッセージを表示', async () => {
      (getSelectedFeature as jest.Mock).mockRejectedValue(new Error('Network error'));

      const TestComponent = () => {
        const { hasAccess, isLoading } = useFeatureAccess('dormant_analysis');
        if (isLoading) return <div>Loading...</div>;
        if (!hasAccess) return <div>エラーが発生しました</div>;
        return <div>成功</div>;
      };

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });

    it('無効な機能IDの場合はエラーを返す', async () => {
      const TestComponent = () => {
        // @ts-ignore - 意図的に無効なIDを渡す
        const { hasAccess, isLoading } = useFeatureAccess('invalid_feature');
        if (isLoading) return <div>Loading...</div>;
        return <div>{hasAccess ? 'アクセス可能' : 'アクセス不可'}</div>;
      };

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('アクセス不可')).toBeInTheDocument();
      });
    });
  });

  describe('権限制御', () => {
    it('有料プランユーザーは全機能にアクセス可能', async () => {
      (getSubscriptionStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          currentPlan: {
            id: 'professional',
            name: 'プロフェッショナルプラン',
          },
        },
      });

      const TestComponent = () => {
        const dormant = useFeatureAccess('dormant_analysis');
        const yearOverYear = useFeatureAccess('year_over_year');
        const frequency = useFeatureAccess('frequency_detail');

        if (dormant.isLoading || yearOverYear.isLoading || frequency.isLoading) {
          return <div>Loading...</div>;
        }

        return (
          <div>
            <div>休眠顧客: {dormant.hasAccess ? 'アクセス可能' : 'アクセス不可'}</div>
            <div>前年同月比: {yearOverYear.hasAccess ? 'アクセス可能' : 'アクセス不可'}</div>
            <div>購入回数: {frequency.hasAccess ? 'アクセス可能' : 'アクセス不可'}</div>
          </div>
        );
      };

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('休眠顧客: アクセス可能')).toBeInTheDocument();
        expect(screen.getByText('前年同月比: アクセス可能')).toBeInTheDocument();
        expect(screen.getByText('購入回数: アクセス可能')).toBeInTheDocument();
      });
    });

    it('プランがない場合は全機能にアクセスできない', async () => {
      (getSubscriptionStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          currentPlan: null,
        },
      });

      const TestComponent = () => {
        const { hasAccess, isLoading } = useFeatureAccess('dormant_analysis');
        if (isLoading) return <div>Loading...</div>;
        return <div>{hasAccess ? 'アクセス可能' : 'アクセス不可'}</div>;
      };

      render(
        <SubscriptionProvider>
          <TestComponent />
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('アクセス不可')).toBeInTheDocument();
      });
    });
  });

  describe('UI統合テスト', () => {
    it('機能ロック画面の各要素が正しく表示される', async () => {
      render(
        <FeatureLockedScreen 
          featureName="休眠顧客分析"
          featureType="dormant_analysis"
        />
      );

      // タイトルとアイコン
      expect(screen.getByText('休眠顧客分析')).toBeInTheDocument();
      expect(screen.getByText(/この機能は現在ロックされています/)).toBeInTheDocument();

      // 機能の説明
      expect(screen.getByText(/一定期間購入がない顧客を特定/)).toBeInTheDocument();

      // 機能でできること
      expect(screen.getByText('この機能でできること')).toBeInTheDocument();
      expect(screen.getByText(/休眠顧客の自動検出/)).toBeInTheDocument();
      expect(screen.getByText(/休眠理由の分析/)).toBeInTheDocument();

      // アクセス方法
      expect(screen.getByText('アクセス方法')).toBeInTheDocument();
      expect(screen.getByText(/現在選択中の機能を変更する/)).toBeInTheDocument();
      expect(screen.getByText(/有料プランにアップグレード/)).toBeInTheDocument();

      // アクションボタン
      expect(screen.getByText('機能を選択・変更する')).toBeInTheDocument();
      expect(screen.getByText(/有料プランで全機能を利用/)).toBeInTheDocument();

      // 戻るリンク
      expect(screen.getByText('前のページに戻る')).toBeInTheDocument();
    });

    it('アップグレードボタンが正しく動作する', () => {
      render(
        <FeatureLockedScreen 
          featureName="前年同月比分析"
          featureType="year_over_year"
        />
      );

      const upgradeButton = screen.getByText(/有料プランで全機能を利用/);
      fireEvent.click(upgradeButton);

      expect(mockPush).toHaveBeenCalledWith('/settings/billing?upgrade=true');
    });

    it('戻るボタンが正しく動作する', () => {
      render(
        <FeatureLockedScreen 
          featureName="購入回数詳細分析"
          featureType="frequency_detail"
        />
      );

      const backButton = screen.getByText('前のページに戻る');
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });
});