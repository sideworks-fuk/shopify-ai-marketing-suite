#!/usr/bin/env python3
"""
Shopify公式ドキュメントに基づく正確なHMAC検証
"""

import hmac
import hashlib
from urllib.parse import parse_qs, urlencode

# 実際のコールバックデータ
callback_url = "https://localhost:7088/api/shopify/callback?code=f995556a3a0fc6a02526e92e9d5229cc&shop=fuk-dev4.myshopify.com&state=pvdcJqsr8A5WwCwfwvn2hANHuUJLRFfd&hmac=73e68ab6c6542254b70a4e9966fda6b8cc3528652e7167c2d45bb59e79ea5941&timestamp=1754925455"

# クエリ文字列を抽出
query_string = callback_url.split('?')[1]

# パラメータを解析
params = {}
for param in query_string.split('&'):
    key, value = param.split('=')
    params[key] = value

# HMACを保存して削除
received_hmac = params['hmac']
del params['hmac']

# signatureがあれば削除（通常はない）
if 'signature' in params:
    del params['signature']

# クライアントシークレット
client_secret = 'be83457b1f63f4c9b20d3ea5e62b5ef0'

print("=== Shopify公式仕様に基づくHMAC検証 ===")
print(f"受信HMAC: {received_hmac}")
print(f"クライアントシークレット: {client_secret}")
print()

# 方法1: パラメータをアルファベット順にソート
sorted_params = sorted(params.items())
query_string_1 = '&'.join([f"{k}={v}" for k, v in sorted_params])

print("方法1: アルファベット順（公式ドキュメント準拠）")
print(f"  クエリ文字列: {query_string_1}")

# HMAC-SHA256を計算
computed_hmac_1 = hmac.new(
    client_secret.encode('utf-8'),
    query_string_1.encode('utf-8'),
    hashlib.sha256
).hexdigest()

print(f"  計算HMAC: {computed_hmac_1}")
print(f"  一致: {computed_hmac_1 == received_hmac}")
print()

# 方法2: URLエンコーディングなし、値のみでソート
print("方法2: 値そのままでソート")
print(f"  パラメータ:")
for k, v in sorted_params:
    print(f"    {k} = {v}")

# 方法3: パラメータの順序を変えてテスト
orders = [
    ['code', 'shop', 'state', 'timestamp'],
    ['code', 'shop', 'timestamp', 'state'],
    ['shop', 'code', 'state', 'timestamp'],
    ['timestamp', 'code', 'shop', 'state']
]

print("\n異なる順序でのテスト:")
for i, order in enumerate(orders, 1):
    ordered_params = [(k, params[k]) for k in order]
    query_string = '&'.join([f"{k}={v}" for k, v in ordered_params])
    
    computed_hmac = hmac.new(
        client_secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    print(f"順序{i} ({', '.join(order)}):")
    print(f"  HMAC: {computed_hmac}")
    print(f"  一致: {computed_hmac == received_hmac}")

# 方法4: 異なるエンコーディング
print("\n異なるエンコーディング:")
encodings = ['utf-8', 'ascii', 'latin-1']
for encoding in encodings:
    try:
        computed_hmac = hmac.new(
            client_secret.encode(encoding),
            query_string_1.encode(encoding),
            hashlib.sha256
        ).hexdigest()
        
        print(f"{encoding}:")
        print(f"  HMAC: {computed_hmac}")
        print(f"  一致: {computed_hmac == received_hmac}")
    except Exception as e:
        print(f"{encoding}: エラー - {e}")

# 方法5: 実際のShopifyライブラリの実装を模倣
print("\n方法5: Shopifyライブラリ風の実装:")

def shopify_verify_hmac(params_dict, secret):
    """Shopifyライブラリ風のHMAC検証"""
    # hmacとsignatureを除外
    encoded_params = {}
    for key, value in params_dict.items():
        if key not in ['hmac', 'signature']:
            encoded_params[key] = value
    
    # キーでソート
    sorted_params = sorted(encoded_params.items(), key=lambda x: x[0])
    
    # クエリ文字列を構築
    query_string = '&'.join(['%s=%s' % (key, value) for key, value in sorted_params])
    
    # HMAC計算
    return hmac.new(
        secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

computed_hmac_5 = shopify_verify_hmac(params, client_secret)
print(f"  計算HMAC: {computed_hmac_5}")
print(f"  一致: {computed_hmac_5 == received_hmac}")

print("\n=== 診断結果 ===")
if computed_hmac_1 != received_hmac:
    print("❌ HMACが一致しません")
    print("考えられる原因:")
    print("1. クライアントシークレットが正しくない")
    print("2. Shopifyアプリの設定に問題がある")
    print("3. パラメータが改ざんされている")
    print("4. リダイレクトURLの設定が正しくない")
else:
    print("✅ HMAC検証成功！")