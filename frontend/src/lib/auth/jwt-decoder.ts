/**
 * JWT デコード機能
 * 
 * @author YUKI
 * @date 2025-08-02
 */

export interface JWTPayload {
  tenant_id?: string;
  store_id?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * JWTトークンをデコードする
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

/**
 * テナントIDを取得
 */
export function getTenantId(): string | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  
  const payload = decodeToken(token);
  return payload?.tenant_id || null;
}

/**
 * ストアIDを取得
 */
export function getStoreId(): string | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  
  const payload = decodeToken(token);
  return payload?.store_id || null;
}

/**
 * トークンが有効かチェック
 */
export function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp ? payload.exp > now : false;
}

/**
 * トークン情報を取得
 */
export function getTokenInfo(): JWTPayload | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  
  return decodeToken(token);
}
