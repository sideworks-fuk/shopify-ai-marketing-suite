#!/usr/bin/env python3
"""
Shopify HMAC検証テストスクリプト
実際のコールバックデータで検証方法を確認
"""

import hmac
import hashlib

# 実際のShopifyコールバックデータ（2025-01-13記録）
actual_data = {
    'code': 'f995556a3a0fc6a02526e92e9d5229cc',
    'shop': 'fuk-dev4.myshopify.com',
    'state': 'pvdcJqsr8A5WwCwfwvn2hANHuUJLRFfd',
    'timestamp': '1754925455',
    'received_hmac': '73e68ab6c6542254b70a4e9966fda6b8cc3528652e7167c2d45bb59e79ea5941'
}

api_secret = 'be83457b1f63f4c9b20d3ea5e62b5ef0'

print("=== Shopify HMAC検証テスト (Python) ===")
print(f"受信HMAC: {actual_data['received_hmac']}")
print(f"APIシークレット: {api_secret}")
print()

def test_hmac(params, secret, description):
    """HMACを計算してテスト"""
    # クエリ文字列を構築
    query_string = '&'.join([f"{k}={v}" for k, v in params])
    
    # HMAC-SHA256を計算
    computed_hmac = hmac.new(
        secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    print(f"{description}")
    print(f"  クエリ文字列: {query_string}")
    print(f"  計算HMAC: {computed_hmac}")
    print(f"  一致: {computed_hmac == actual_data['received_hmac']}")
    print()
    
    return computed_hmac == actual_data['received_hmac']

# 方法1: 辞書順（アルファベット順）
sorted_params = [
    ('code', actual_data['code']),
    ('shop', actual_data['shop']),
    ('state', actual_data['state']),
    ('timestamp', actual_data['timestamp'])
]
test_hmac(sorted_params, api_secret, "方法1: 辞書順ソート")

# 方法2: URLの順序（実際の順序）
url_order_params = [
    ('code', actual_data['code']),
    ('shop', actual_data['shop']),
    ('state', actual_data['state']),
    ('timestamp', actual_data['timestamp'])
]
test_hmac(url_order_params, api_secret, "方法2: URL記載順")

# 方法3: timestampを最初に
timestamp_first_params = [
    ('timestamp', actual_data['timestamp']),
    ('code', actual_data['code']),
    ('shop', actual_data['shop']),
    ('state', actual_data['state'])
]
test_hmac(timestamp_first_params, api_secret, "方法3: timestamp最初")

# 方法4: shopを最初に
shop_first_params = [
    ('shop', actual_data['shop']),
    ('code', actual_data['code']),
    ('state', actual_data['state']),
    ('timestamp', actual_data['timestamp'])
]
test_hmac(shop_first_params, api_secret, "方法4: shop最初")

# 方法5: ASCIIエンコーディング
def test_hmac_ascii(params, secret, description):
    """ASCIIエンコーディングでHMACを計算"""
    query_string = '&'.join([f"{k}={v}" for k, v in params])
    
    # ASCII変換（エラーを無視）
    try:
        secret_bytes = secret.encode('ascii')
        query_bytes = query_string.encode('ascii')
        
        computed_hmac = hmac.new(
            secret_bytes,
            query_bytes,
            hashlib.sha256
        ).hexdigest()
        
        print(f"{description}")
        print(f"  クエリ文字列: {query_string}")
        print(f"  計算HMAC: {computed_hmac}")
        print(f"  一致: {computed_hmac == actual_data['received_hmac']}")
        print()
        
        return computed_hmac == actual_data['received_hmac']
    except Exception as e:
        print(f"{description} - エラー: {e}")
        return False

test_hmac_ascii(sorted_params, api_secret, "方法5: ASCIIエンコーディング + 辞書順")

print("\n=== 追加のデバッグ情報 ===")
print(f"タイムスタンプ: {actual_data['timestamp']} (Unix時間)")
import datetime
dt = datetime.datetime.fromtimestamp(int(actual_data['timestamp']))
print(f"日時: {dt} UTC")
print(f"現在との差: {(datetime.datetime.now() - dt).total_seconds()} 秒")