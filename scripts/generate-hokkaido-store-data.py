#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
北海道物産品ショッピングサイトのデモデータ生成スクリプト
Store ID: 3
データ数: 約1000件の注文
期間: 2022年1月〜2025年7月
"""

import csv
import random
from datetime import datetime, timedelta
import os

# 出力ディレクトリの作成
output_dir = '../data/staging/store3_hokkaido'
os.makedirs(output_dir, exist_ok=True)

# 北海道の地域
HOKKAIDO_CITIES = [
    '札幌市', '函館市', '旭川市', '釧路市', '帯広市', '北見市', '岩見沢市', 
    '網走市', '苫小牧市', '稚内市', '美唄市', '芦別市', '江別市', '赤平市',
    '紋別市', '士別市', '名寄市', '三笠市', '根室市', '千歳市', '滝川市',
    '砂川市', '歌志内市', '深川市', '富良野市', '登別市', '恵庭市', '伊達市',
    '北広島市', '石狩市', '北斗市'
]

# 北海道物産品カテゴリと商品
PRODUCTS = [
    # 海産物
    {'id': 'HKD-001', 'name': '北海道産 いくら醤油漬け 500g', 'category': '海産物', 'vendor': '函館海産', 'price': 8500, 'sku': 'SEA-IKR-500'},
    {'id': 'HKD-002', 'name': '北海道産 毛ガニ 特大サイズ 2杯セット', 'category': '海産物', 'vendor': '函館海産', 'price': 12000, 'sku': 'SEA-KAN-002'},
    {'id': 'HKD-003', 'name': '北海道産 ホタテ貝柱 1kg', 'category': '海産物', 'vendor': 'オホーツク水産', 'price': 6800, 'sku': 'SEA-HOT-001'},
    {'id': 'HKD-004', 'name': '北海道産 うに 木箱入り 100g×2', 'category': '海産物', 'vendor': '利尻水産', 'price': 9800, 'sku': 'SEA-UNI-002'},
    {'id': 'HKD-005', 'name': '北海道産 鮭とば 500g', 'category': '海産物', 'vendor': '知床加工', 'price': 3500, 'sku': 'SEA-SAK-500'},
    {'id': 'HKD-006', 'name': '北海道産 タラバガニ脚 1kg', 'category': '海産物', 'vendor': '稚内港直送', 'price': 15000, 'sku': 'SEA-TAR-001'},
    {'id': 'HKD-007', 'name': '北海道産 秋鮭 切り身セット', 'category': '海産物', 'vendor': '函館海産', 'price': 4500, 'sku': 'SEA-AKI-001'},
    {'id': 'HKD-008', 'name': '北海道産 昆布 羅臼昆布 200g', 'category': '海産物', 'vendor': '羅臼昆布店', 'price': 2800, 'sku': 'SEA-KON-200'},
    
    # 農産物
    {'id': 'HKD-021', 'name': '北海道産 じゃがいも 男爵 10kg', 'category': '農産物', 'vendor': '十勝ファーム', 'price': 3200, 'sku': 'AGR-POT-010'},
    {'id': 'HKD-022', 'name': '北海道産 とうもろこし ゴールドラッシュ 10本', 'category': '農産物', 'vendor': '美瑛農園', 'price': 3800, 'sku': 'AGR-COR-010'},
    {'id': 'HKD-023', 'name': '北海道産 メロン 夕張メロン 2玉', 'category': '農産物', 'vendor': '夕張農協', 'price': 8000, 'sku': 'AGR-MEL-002'},
    {'id': 'HKD-024', 'name': '北海道産 アスパラガス 1kg', 'category': '農産物', 'vendor': '富良野農園', 'price': 4200, 'sku': 'AGR-ASP-001'},
    {'id': 'HKD-025', 'name': '北海道産 玉ねぎ 北もみじ 10kg', 'category': '農産物', 'vendor': '北見農場', 'price': 2800, 'sku': 'AGR-ONI-010'},
    {'id': 'HKD-026', 'name': '北海道産 かぼちゃ 栗ゆたか 5kg', 'category': '農産物', 'vendor': '十勝ファーム', 'price': 2500, 'sku': 'AGR-PUM-005'},
    
    # 乳製品
    {'id': 'HKD-041', 'name': '北海道産 バター 200g×5個セット', 'category': '乳製品', 'vendor': '十勝乳業', 'price': 3500, 'sku': 'DAI-BUT-005'},
    {'id': 'HKD-042', 'name': '北海道産 チーズ詰め合わせ 6種', 'category': '乳製品', 'vendor': '富良野チーズ工房', 'price': 5800, 'sku': 'DAI-CHE-006'},
    {'id': 'HKD-043', 'name': '北海道産 生クリーム 200ml×6本', 'category': '乳製品', 'vendor': '札幌ミルク', 'price': 3200, 'sku': 'DAI-CRE-006'},
    {'id': 'HKD-044', 'name': '北海道産 飲むヨーグルト 900ml×6本', 'category': '乳製品', 'vendor': '小樽牧場', 'price': 3600, 'sku': 'DAI-YOG-006'},
    {'id': 'HKD-045', 'name': '北海道産 アイスクリーム 12個セット', 'category': '乳製品', 'vendor': '札幌アイス', 'price': 4800, 'sku': 'DAI-ICE-012'},
    
    # 肉製品
    {'id': 'HKD-061', 'name': '北海道産 和牛 サーロインステーキ 200g×4枚', 'category': '肉製品', 'vendor': '十勝和牛', 'price': 12000, 'sku': 'MEA-BEE-004'},
    {'id': 'HKD-062', 'name': '北海道産 ジンギスカン 味付けラム 1kg', 'category': '肉製品', 'vendor': '札幌ジンギスカン', 'price': 3800, 'sku': 'MEA-LAM-001'},
    {'id': 'HKD-063', 'name': '北海道産 豚肉 しゃぶしゃぶ用 1kg', 'category': '肉製品', 'vendor': '帯広豚肉', 'price': 4500, 'sku': 'MEA-POR-001'},
    {'id': 'HKD-064', 'name': '北海道産 鹿肉 ジビエセット', 'category': '肉製品', 'vendor': '知床ジビエ', 'price': 6800, 'sku': 'MEA-DEE-001'},
    
    # スイーツ・お菓子
    {'id': 'HKD-081', 'name': '白い恋人 24枚入り', 'category': 'スイーツ', 'vendor': '石屋製菓', 'price': 1800, 'sku': 'SWE-SHI-024'},
    {'id': 'HKD-082', 'name': 'ロイズ 生チョコレート 詰め合わせ', 'category': 'スイーツ', 'vendor': 'ロイズ', 'price': 3200, 'sku': 'SWE-ROY-001'},
    {'id': 'HKD-083', 'name': '六花亭 マルセイバターサンド 10個入', 'category': 'スイーツ', 'vendor': '六花亭', 'price': 1500, 'sku': 'SWE-ROK-010'},
    {'id': 'HKD-084', 'name': 'じゃがポックル 10袋入り', 'category': 'スイーツ', 'vendor': 'カルビー', 'price': 1200, 'sku': 'SWE-JAG-010'},
    {'id': 'HKD-085', 'name': 'とうきびチョコ 20本入り', 'category': 'スイーツ', 'vendor': 'ホリ', 'price': 2000, 'sku': 'SWE-TOU-020'},
    {'id': 'HKD-086', 'name': 'ハスカップジュエリー 6個入', 'category': 'スイーツ', 'vendor': 'もりもと', 'price': 1800, 'sku': 'SWE-HAS-006'},
    
    # ラーメン・麺類
    {'id': 'HKD-101', 'name': '札幌味噌ラーメン 5食セット', 'category': 'ラーメン', 'vendor': '札幌ラーメン横丁', 'price': 2500, 'sku': 'NOO-MIS-005'},
    {'id': 'HKD-102', 'name': '函館塩ラーメン 5食セット', 'category': 'ラーメン', 'vendor': '函館麺工房', 'price': 2300, 'sku': 'NOO-SHI-005'},
    {'id': 'HKD-103', 'name': '旭川醤油ラーメン 5食セット', 'category': 'ラーメン', 'vendor': '旭川ラーメン村', 'price': 2400, 'sku': 'NOO-SHO-005'},
    {'id': 'HKD-104', 'name': '北海道ラーメン 食べ比べ10食', 'category': 'ラーメン', 'vendor': '北海道麺', 'price': 4800, 'sku': 'NOO-MIX-010'},
    
    # 飲料
    {'id': 'HKD-121', 'name': 'サッポロクラシック 350ml×24本', 'category': '飲料', 'vendor': 'サッポロビール', 'price': 5200, 'sku': 'DRI-BEE-024'},
    {'id': 'HKD-122', 'name': '北海道限定 ガラナ 500ml×24本', 'category': '飲料', 'vendor': 'コアップガラナ', 'price': 3600, 'sku': 'DRI-GAR-024'},
    {'id': 'HKD-123', 'name': '余市ワイン 赤白セット', 'category': '飲料', 'vendor': '余市ワイナリー', 'price': 6800, 'sku': 'DRI-WIN-002'},
    {'id': 'HKD-124', 'name': 'リボンナポリン 500ml×24本', 'category': '飲料', 'vendor': 'ポッカサッポロ', 'price': 3200, 'sku': 'DRI-NAP-024'},
    
    # その他加工品
    {'id': 'HKD-141', 'name': 'スープカレーの素 5食分', 'category': '加工品', 'vendor': '札幌スープカレー', 'price': 2000, 'sku': 'PRO-SOU-005'},
    {'id': 'HKD-142', 'name': '松前漬け 500g', 'category': '加工品', 'vendor': '松前漬本舗', 'price': 2800, 'sku': 'PRO-MAT-500'},
    {'id': 'HKD-143', 'name': 'ザンギのたれ 3本セット', 'category': '加工品', 'vendor': '北海道醤油', 'price': 1500, 'sku': 'PRO-ZAN-003'},
    {'id': 'HKD-144', 'name': '北海道味噌 1kg×3個', 'category': '加工品', 'vendor': '札幌味噌', 'price': 2400, 'sku': 'PRO-MIS-003'}
]

# 顧客名リスト（日本の一般的な姓名）
LAST_NAMES = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', 
              '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '斎藤', '林', '清水']
FIRST_NAMES_MALE = ['太郎', '次郎', '三郎', '健太', '翔太', '大輝', '拓也', '直樹', '健一', '誠']
FIRST_NAMES_FEMALE = ['花子', '美咲', '愛', '彩', '舞', '優子', '真由美', '恵子', '幸子', '陽子']

def generate_customer_name():
    """顧客名を生成"""
    last_name = random.choice(LAST_NAMES)
    if random.random() < 0.5:
        first_name = random.choice(FIRST_NAMES_MALE)
    else:
        first_name = random.choice(FIRST_NAMES_FEMALE)
    return f"{last_name}{first_name}"

def generate_customers(num_customers=150):
    """顧客データを生成"""
    customers = []
    for i in range(num_customers):
        customer_id = f"CUST-3{i+1:03d}"
        name = generate_customer_name()
        email = f"hokkaido-customer-{i+1:03d}@example.com"
        
        # 購買パターンを決定
        if i < 20:  # VIP顧客（13%）
            total_orders = random.randint(15, 30)
            total_spent = random.randint(200000, 500000)
            tags = "VIP,リピーター,北海道愛好家"
        elif i < 60:  # リピーター（27%）
            total_orders = random.randint(5, 14)
            total_spent = random.randint(50000, 199999)
            tags = "リピーター"
        else:  # 一般顧客（60%）
            total_orders = random.randint(1, 4)
            total_spent = random.randint(5000, 49999)
            tags = "一般顧客"
        
        # 地域を決定（道内60%、道外40%）
        if random.random() < 0.6:
            city = random.choice(HOKKAIDO_CITIES)
            province = "北海道"
            province_code = "JP-01"
        else:
            # 道外の主要都市
            cities = [
                ("東京都", "東京", "JP-13"),
                ("大阪府", "大阪", "JP-27"),
                ("愛知県", "名古屋", "JP-23"),
                ("福岡県", "福岡", "JP-40"),
                ("宮城県", "仙台", "JP-04")
            ]
            province, city, province_code = random.choice(cities)
        
        customer = {
            'Customer ID': customer_id,
            'First Name': name[1:],
            'Last Name': name[0],
            'Email': email,
            'Accepts Email Marketing': random.choice(['yes', 'no']),
            'Company': '',
            'Address1': '',
            'Address2': '',
            'City': city,
            'Province': province,
            'Province Code': province_code,
            'Country': '日本',
            'Country Code': 'JP',
            'Zip': '',
            'Phone': f"090-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            'Accepts SMS Marketing': random.choice(['yes', 'no']),
            'Total Spent': total_spent,
            'Total Orders': total_orders,
            'Tags': tags,
            'Note': '',
            'Tax Exempt': 'no',
            'Company / 店舗名': '',
            'Industry / 業種名': '',
            'Phone': f"090-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
            'Created At': '',
            'Updated At': ''
        }
        customers.append(customer)
    
    return customers

def generate_products():
    """商品データをCSV形式に変換"""
    products_csv = []
    for product in PRODUCTS:
        # バリアントを考慮（一部商品に複数サイズ）
        if product['category'] in ['海産物', '農産物']:
            # サイズバリアントを追加
            sizes = ['小', '中', '大']
            for size in sizes:
                price_multiplier = {'小': 0.7, '中': 1.0, '大': 1.5}[size]
                products_csv.append({
                    'Handle': product['id'].lower(),
                    'Title': product['name'],
                    'Body (HTML)': f"<p>北海道から直送！新鮮な{product['name']}をお届けします。</p>",
                    'Vendor': product['vendor'],
                    'Product Category': f"ホーム&ガーデン > 食品 > {product['category']}",
                    'Type': product['category'],
                    'Tags': f"北海道,{product['category']},直送,新鮮",
                    'Published': 'TRUE',
                    'Option1 Name': 'サイズ',
                    'Option1 Value': size,
                    'Option2 Name': '',
                    'Option2 Value': '',
                    'Option3 Name': '',
                    'Option3 Value': '',
                    'Variant SKU': f"{product['sku']}-{size[0]}",
                    'Variant Grams': 1000,
                    'Variant Inventory Tracker': 'shopify',
                    'Variant Inventory Policy': 'deny',
                    'Variant Fulfillment Service': 'manual',
                    'Variant Price': int(product['price'] * price_multiplier),
                    'Variant Compare At Price': int(product['price'] * price_multiplier * 1.2),
                    'Variant Requires Shipping': 'TRUE',
                    'Variant Taxable': 'TRUE',
                    'Variant Barcode': '',
                    'Image Src': '',
                    'Image Position': '',
                    'Image Alt Text': '',
                    'Gift Card': 'FALSE',
                    'SEO Title': f"{product['name']} | 北海道物産品",
                    'SEO Description': f"北海道直送の{product['name']}。新鮮で美味しい北海道の味をお届けします。",
                    'Google Shopping / Google Product Category': '',
                    'Metafield: custom.function [single_line_text_field]': '',
                    'Metafield: custom.material [single_line_text_field]': '',
                    'Metafield: custom.size [single_line_text_field]': size,
                    'Metafield: custom.color_pattern [single_line_text_field]': '',
                    'Metafield: custom.food_product_form [single_line_text_field]': product['category'],
                    'Metafield: custom.user_type [single_line_text_field]': '一般',
                    'Metafield: custom.complementary_products [single_line_text_field]': '',
                    'Metafield: custom.related_products [single_line_text_field]': '',
                    'Metafield: custom.related_products_display [single_line_text_field]': '',
                    'Metafield: seo.hidden.product_search_boost_queries [single_line_text_field]': f"{product['category']},北海道",
                    'Status': 'active'
                })
        else:
            # サイズバリアントなし
            products_csv.append({
                'Handle': product['id'].lower(),
                'Title': product['name'],
                'Body (HTML)': f"<p>北海道の名産品！{product['name']}をお楽しみください。</p>",
                'Vendor': product['vendor'],
                'Product Category': f"ホーム&ガーデン > 食品 > {product['category']}",
                'Type': product['category'],
                'Tags': f"北海道,{product['category']},お土産,名産品",
                'Published': 'TRUE',
                'Option1 Name': '',
                'Option1 Value': '',
                'Option2 Name': '',
                'Option2 Value': '',
                'Option3 Name': '',
                'Option3 Value': '',
                'Variant SKU': product['sku'],
                'Variant Grams': 500,
                'Variant Inventory Tracker': 'shopify',
                'Variant Inventory Policy': 'deny',
                'Variant Fulfillment Service': 'manual',
                'Variant Price': product['price'],
                'Variant Compare At Price': int(product['price'] * 1.2),
                'Variant Requires Shipping': 'TRUE',
                'Variant Taxable': 'TRUE',
                'Variant Barcode': '',
                'Image Src': '',
                'Image Position': '',
                'Image Alt Text': '',
                'Gift Card': 'FALSE',
                'SEO Title': f"{product['name']} | 北海道物産品",
                'SEO Description': f"北海道の名産品{product['name']}。本場の味をお届けします。",
                'Google Shopping / Google Product Category': '',
                'Metafield: custom.function [single_line_text_field]': '',
                'Metafield: custom.material [single_line_text_field]': '',
                'Metafield: custom.size [single_line_text_field]': '',
                'Metafield: custom.color_pattern [single_line_text_field]': '',
                'Metafield: custom.food_product_form [single_line_text_field]': product['category'],
                'Metafield: custom.user_type [single_line_text_field]': '一般',
                'Metafield: custom.complementary_products [single_line_text_field]': '',
                'Metafield: custom.related_products [single_line_text_field]': '',
                'Metafield: custom.related_products_display [single_line_text_field]': '',
                'Metafield: seo.hidden.product_search_boost_queries [single_line_text_field]': f"{product['category']},北海道",
                'Status': 'active'
            })
    
    return products_csv

def generate_orders(customers, num_orders=1000):
    """注文データを生成"""
    orders = []
    order_id = 3001  # Store 3の注文は3001から開始
    
    # 日付範囲（2022年1月〜2025年7月）
    start_date = datetime(2022, 1, 1)
    end_date = datetime(2025, 7, 28)
    
    # 季節性を考慮した商品選択
    seasonal_products = {
        'winter': ['HKD-001', 'HKD-002', 'HKD-006', 'HKD-101', 'HKD-102', 'HKD-103'],  # カニ、ラーメン
        'spring': ['HKD-022', 'HKD-023', 'HKD-024', 'HKD-041', 'HKD-042'],  # アスパラ、メロン、乳製品
        'summer': ['HKD-022', 'HKD-023', 'HKD-045', 'HKD-122', 'HKD-124'],  # とうもろこし、メロン、飲料
        'autumn': ['HKD-001', 'HKD-007', 'HKD-021', 'HKD-026'],  # いくら、鮭、じゃがいも、かぼちゃ
    }
    
    for i in range(num_orders):
        # ランダムな日付を生成
        days_between = (end_date - start_date).days
        random_days = random.randint(0, days_between)
        order_date = start_date + timedelta(days=random_days)
        
        # 季節を判定
        month = order_date.month
        if month in [12, 1, 2]:
            season = 'winter'
        elif month in [3, 4, 5]:
            season = 'spring'
        elif month in [6, 7, 8]:
            season = 'summer'
        else:
            season = 'autumn'
        
        # 顧客を選択（リピーターは確率高め）
        customer = random.choice(customers)
        if 'VIP' in customer['Tags']:
            # VIP顧客は80%の確率で選ばれる
            if random.random() > 0.2:
                customer = random.choice([c for c in customers if 'VIP' in c['Tags']])
        elif 'リピーター' in customer['Tags']:
            # リピーターは60%の確率で選ばれる
            if random.random() > 0.4:
                customer = random.choice([c for c in customers if 'リピーター' in c['Tags']])
        
        # 商品を選択（季節商品を優先）
        num_items = random.randint(1, 4)
        selected_products = []
        
        for _ in range(num_items):
            if random.random() < 0.7:  # 70%の確率で季節商品
                product_id = random.choice(seasonal_products[season])
            else:
                product_id = random.choice([p['id'] for p in PRODUCTS])
            
            product = next(p for p in PRODUCTS if p['id'] == product_id)
            quantity = random.randint(1, 3)
            
            # サイズバリアントがある場合
            if product['category'] in ['海産物', '農産物']:
                size = random.choice(['小', '中', '大'])
                price_multiplier = {'小': 0.7, '中': 1.0, '大': 1.5}[size]
                price = int(product['price'] * price_multiplier)
                sku = f"{product['sku']}-{size[0]}"
            else:
                size = ''
                price = product['price']
                sku = product['sku']
            
            selected_products.append({
                'product': product,
                'quantity': quantity,
                'price': price,
                'sku': sku,
                'size': size
            })
        
        # 注文金額を計算
        subtotal = sum(p['price'] * p['quantity'] for p in selected_products)
        shipping = 800 if subtotal < 10000 else 0  # 1万円以上送料無料
        tax = int(subtotal * 0.1)
        total = subtotal + shipping + tax
        
        # 最初の商品で注文を作成
        first_product = selected_products[0]
        order = {
            'Name': customer['First Name'] + customer['Last Name'],
            'Email': customer['Email'],
            'Financial Status': 'paid',
            'Paid at': order_date.strftime('%Y-%m-%d %H:%M:%S +0900'),
            'Fulfillment Status': 'fulfilled',
            'Fulfilled at': (order_date + timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S +0900'),
            'Currency': 'JPY',
            'Subtotal': subtotal,
            'Shipping': shipping,
            'Taxes': tax,
            'Total': total,
            'Discount Code': '',
            'Discount Amount': 0,
            'Shipping Method': '宅配便',
            'Created at': order_date.strftime('%Y-%m-%d %H:%M:%S +0900'),
            'Lineitem quantity': first_product['quantity'],
            'Lineitem name': first_product['product']['name'] + (f" ({first_product['size']})" if first_product['size'] else ''),
            'Lineitem price': first_product['price'],
            'Lineitem compare at price': int(first_product['price'] * 1.2),
            'Lineitem sku': first_product['sku'],
            'Lineitem requires shipping': 'true',
            'Lineitem taxable': 'true',
            'Lineitem fulfillment status': 'fulfilled',
            'Billing Name': customer['First Name'] + customer['Last Name'],
            'Billing Street': '',
            'Billing Address1': '',
            'Billing Address2': '',
            'Billing Company': '',
            'Billing City': customer['City'],
            'Billing Zip': '',
            'Billing Province': customer['Province'],
            'Billing Country': '日本',
            'Billing Phone': customer['Phone'],
            'Shipping Name': customer['First Name'] + customer['Last Name'],
            'Shipping Street': '',
            'Shipping Address1': '',
            'Shipping Address2': '',
            'Shipping Company': '',
            'Shipping City': customer['City'],
            'Shipping Zip': '',
            'Shipping Province': customer['Province'],
            'Shipping Country': '日本',
            'Shipping Phone': customer['Phone'],
            'Notes': f"北海道物産品 {season}の注文",
            'Cancelled at': '',
            'Payment Method': 'クレジットカード',
            'Payment Reference': f'pay-3-{order_id}',
            'Refunded Amount': 0,
            'Vendor': first_product['product']['vendor'],
            'Outstanding Balance': 0,
            'Employee': '',
            'Location': '',
            'Device ID': '',
            'Id': f'ORD-{order_id}',
            'Tags': f"北海道,{season},{first_product['product']['category']}",
            'Risk Level': 'Low',
            'Source': 'web',
            'Lineitem discount': 0,
            'Tax 1 Name': '消費税 10%',
            'Tax 1 Value': tax,
            'Tax 2 Name': '',
            'Tax 2 Value': '',
            'Tax 3 Name': '',
            'Tax 3 Value': '',
            'Tax 4 Name': '',
            'Tax 4 Value': '',
            'Tax 5 Name': '',
            'Tax 5 Value': '',
            'Phone': customer['Phone'],
            'Receipt Number': '',
            'Duties': 0,
            'Billing Province Name': customer['Province'],
            'Shipping Province Name': customer['Province'],
            'Payment ID': f'pay-id-3-{order_id}',
            'Payment Terms Name': '',
            'Next Payment Due At': '',
            'Payment References': f'pay-3-{order_id}',
            'Customer ID': customer['Customer ID']
        }
        orders.append(order)
        
        # 追加の商品明細（2個目以降）
        for product_data in selected_products[1:]:
            additional_item = order.copy()
            additional_item['Id'] = ''  # 同じ注文の追加明細はIDを空に
            additional_item['Lineitem quantity'] = product_data['quantity']
            additional_item['Lineitem name'] = product_data['product']['name'] + (f" ({product_data['size']})" if product_data['size'] else '')
            additional_item['Lineitem price'] = product_data['price']
            additional_item['Lineitem compare at price'] = int(product_data['price'] * 1.2)
            additional_item['Lineitem sku'] = product_data['sku']
            additional_item['Vendor'] = product_data['product']['vendor']
            orders.append(additional_item)
        
        order_id += 1
    
    return orders

# メイン処理
if __name__ == '__main__':
    print("北海道物産品ストアのデモデータを生成中...")
    
    # 顧客データ生成
    print("1. 顧客データを生成中...")
    customers = generate_customers(150)
    
    # 顧客データ保存
    with open(f'{output_dir}/customers_store3_hokkaido.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(customers[0].keys()))
        writer.writeheader()
        writer.writerows(customers)
    print(f"   {len(customers)}件の顧客データを生成しました。")
    
    # 商品データ生成
    print("2. 商品データを生成中...")
    products_csv = generate_products()
    
    # 商品データ保存
    with open(f'{output_dir}/products_store3_hokkaido.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(products_csv[0].keys()))
        writer.writeheader()
        writer.writerows(products_csv)
    print(f"   {len(products_csv)}件の商品データを生成しました。")
    
    # 注文データ生成
    print("3. 注文データを生成中...")
    orders = generate_orders(customers, 1000)
    
    # 注文データ保存
    with open(f'{output_dir}/orders_store3_hokkaido.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(orders[0].keys()))
        writer.writeheader()
        writer.writerows(orders)
    print(f"   {len(orders)}件の注文データ（明細含む）を生成しました。")
    
    print("\n生成完了！")
    print(f"保存先: {output_dir}/")
    print("- customers_store3_hokkaido.csv")
    print("- products_store3_hokkaido.csv")
    print("- orders_store3_hokkaido.csv")