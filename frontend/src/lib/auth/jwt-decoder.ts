/**
 * JWT デコード機能
 * 
 * @author YUKI
 * @date 2025-08-02
 * @description JWTトークンをデコードしてtenant_idとstore_idを取得する
 */

import { jwtDecode } from 'jwt-decode';

/**
 * JWTペイロードの型定義
 */
export interface JWTPayload {
  tenant_id: string;
  store_id: string;
  exp: number;
  iat?: number;
  sub?: string;
}

/**
 * JWTトークンをデコードする
 * @param token JWTトークン文字列
 * @returns デコードされたペイロード、または無効な場合はnull
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    // トークンが空または無効な形式の場合は早期リターン
    if (!token || typeof token !== 'string') {
      return null;
    }

    // JWTの基本的な形式チェック（3つのドットで区切られた文字列）
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format');
      return null;
    }

    const decoded = jwtDecode<JWTPayload>(token);
    
    // 必須フィールドの存在確認
    if (!decoded.tenant_id || !decoded.store_id) {
      console.warn('JWT missing required fields: tenant_id or store_id');
      return null;
    }

    // トークンの有効期限確認
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn('JWT token expired');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * LocalStorageからアクセストークンを取得してtenant_idを返す
 * @returns tenant_id、または取得できない場合はnull
 */
export function getTenantId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('No access token found in localStorage');
    return null;
  }
  
  const decoded = decodeToken(token);
  return decoded?.tenant_id || null;
}

/**
 * LocalStorageからアクセストークンを取得してstore_idを返す
 * @returns store_id、または取得できない場合はnull
 */
export function getStoreId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('No access token found in localStorage');
    return null;
  }
  
  const decoded = decodeToken(token);
  return decoded?.store_id || null;
}

/**
 * JWTトークンが有効かどうかをチェック
 * @param token JWTトークン文字列
 * @returns トークンが有効な場合はtrue
 */
export function isTokenValid(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) {
    return false;
  }

  // 有効期限のチェック
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    return false;
  }

  // 必須フィールドの存在チェック
  return !!(decoded.tenant_id && decoded.store_id);
}

/**
 * 現在のトークン情報を取得（デバッグ用）
 * @returns トークン情報のサマリー
 */
export function getTokenInfo(): {
  isValid: boolean;
  tenant_id: string | null;
  store_id: string | null;
  expiresAt: Date | null;
} {
  if (typeof window === 'undefined') {
    return {
      isValid: false,
      tenant_id: null,
      store_id: null,
      expiresAt: null,
    };
  }

  const token = localStorage.getItem('accessToken');
  if (!token) {
    return {
      isValid: false,
      tenant_id: null,
      store_id: null,
      expiresAt: null,
    };
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return {
      isValid: false,
      tenant_id: null,
      store_id: null,
      expiresAt: null,
    };
  }

  return {
    isValid: isTokenValid(token),
    tenant_id: decoded.tenant_id,
    store_id: decoded.store_id,
    expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
  };
}

// 開発環境でのデバッグ用
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).jwtDecoder = {
    decodeToken,
    getTenantId,
    getStoreId,
    isTokenValid,
    getTokenInfo,
  };
}