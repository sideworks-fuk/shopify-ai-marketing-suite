'use client';

import { useState, useEffect } from 'react';
import { getAvailableEnvironments } from '@/lib/config/environments';
import { getEnvironmentInfo } from '@/lib/api-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Settings, Globe } from 'lucide-react';

interface EnvironmentSelectorProps {
  showDetails?: boolean;
  onEnvironmentChange?: (environment: string) => void;
}

export const EnvironmentSelector = ({ 
  showDetails = false, 
  onEnvironmentChange 
}: EnvironmentSelectorProps) => {
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('');
  const [availableEnvironments, setAvailableEnvironments] = useState<any[]>([]);
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      const info = getEnvironmentInfo();
      const environments = getAvailableEnvironments();
      
      setCurrentEnvironment(info.currentEnvironment);
      setAvailableEnvironments(environments);
      setEnvironmentInfo(info);
    }
  }, []);

  const handleEnvironmentChange = (envKey: string) => {
    // 環境変数を動的に変更（実際の実装では適切な方法を使用）
    if (typeof window !== 'undefined') {
      // ローカルストレージに保存
      localStorage.setItem('selectedEnvironment', envKey);
      
      // ページをリロードして環境を反映
      window.location.reload();
    }
    
    setCurrentEnvironment(envKey);
    onEnvironmentChange?.(envKey);
  };

  if (!environmentInfo) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4" />
          環境設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 現在の環境表示 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">現在の環境:</span>
            <Badge 
              variant={environmentInfo.isProduction ? "destructive" : "secondary"}
              className="text-xs"
            >
              {environmentInfo.environmentName}
            </Badge>
          </div>
          
          {showDetails && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>URL: {environmentInfo.apiBaseUrl}</div>
              <div>説明: {environmentInfo.description}</div>
            </div>
          )}
        </div>

        {/* 環境切り替えボタン */}
        <div className="space-y-2">
          <span className="text-sm font-medium">環境を切り替え:</span>
          <div className="grid grid-cols-1 gap-2">
            {availableEnvironments.map((env) => (
              <Button
                key={env.name}
                variant={currentEnvironment === env.name ? "default" : "outline"}
                size="sm"
                onClick={() => handleEnvironmentChange(env.name)}
                className="justify-start"
                disabled={currentEnvironment === env.name}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{env.name}</span>
                  {currentEnvironment === env.name && (
                    <Badge variant="secondary" className="text-xs">
                      現在
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* 注意事項 */}
        <Alert className="text-xs">
          <Info className="h-3 w-3" />
          <AlertDescription>
            環境を切り替えると、ページがリロードされます。
            本番環境では環境切り替え機能は無効化されます。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default EnvironmentSelector; 