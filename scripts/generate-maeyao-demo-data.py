#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
早稲田メーヤウ（前屋敷カレー）デモデータ生成スクリプト
Store ID: 4
データ数: 約800件の注文（2017年閉店→2018年復活のストーリーを反映）
期間: 2016年1月〜2017年3月（閉店）、2018年6月〜2025年7月（復活後）
"""

import csv
import random
from datetime import datetime, timedelta
import os

# 出力ディレクトリの作成
output_dir = '../data/staging/store4_maeyao'
os.makedirs(output_dir, exist_ok=True)

# カレー商品データ
CURRY_PRODUCTS = [
    # 冷凍カレー
    {'id': 'MAE-001', 'name': 'チキンカレー（冷凍）', 'category': '冷凍カレー', 'type': 'チキン', 'spice_level': 2, 'price': 980, 'sku': 'FRZ-CHK-001'},
    {'id': 'MAE-002', 'name': 'ポークカレー（冷凍）', 'category': '冷凍カレー', 'type': 'ポーク', 'spice_level': 2, 'price': 980, 'sku': 'FRZ-PRK-001'},
    {'id': 'MAE-003', 'name': '激辛チキンカレー（冷凍）', 'category': '冷凍カレー', 'type': '激辛チキン', 'spice_level': 4, 'price': 1080, 'sku': 'FRZ-SCHK-001'},
    {'id': 'MAE-004', 'name': '激辛ポークカレー（冷凍）', 'category': '冷凍カレー', 'type': '激辛ポーク', 'spice_level': 4, 'price': 1080, 'sku': 'FRZ-SPRK-001'},
    {'id': 'MAE-005', 'name': '超激辛スペシャルカレー（冷凍）', 'category': '冷凍カレー', 'type': '超激辛', 'spice_level': 5, 'price': 1280, 'sku': 'FRZ-SUPER-001'},
    {'id': 'MAE-006', 'name': 'マッサマンカレー（冷凍）', 'category': '冷凍カレー', 'type': 'マッサマン', 'spice_level': 2, 'price': 1180, 'sku': 'FRZ-MAS-001'},
    {'id': 'MAE-007', 'name': 'グリーンカレー（冷凍）', 'category': '冷凍カレー', 'type': 'グリーン', 'spice_level': 3, 'price': 1180, 'sku': 'FRZ-GRN-001'},
    {'id': 'MAE-008', 'name': 'レッドカレー（冷凍）', 'category': '冷凍カレー', 'type': 'レッド', 'spice_level': 4, 'price': 1180, 'sku': 'FRZ-RED-001'},
    
    # レトルトカレー
    {'id': 'MAE-021', 'name': 'チキンカレー（レトルト）', 'category': 'レトルトカレー', 'type': 'チキン', 'spice_level': 2, 'price': 680, 'sku': 'RET-CHK-001'},
    {'id': 'MAE-022', 'name': 'ポークカレー（レトルト）', 'category': 'レトルトカレー', 'type': 'ポーク', 'spice_level': 2, 'price': 680, 'sku': 'RET-PRK-001'},
    {'id': 'MAE-023', 'name': '激辛チキンカレー（レトルト）', 'category': 'レトルトカレー', 'type': '激辛チキン', 'spice_level': 4, 'price': 780, 'sku': 'RET-SCHK-001'},
    {'id': 'MAE-024', 'name': '激辛ポークカレー（レトルト）', 'category': 'レトルトカレー', 'type': '激辛ポーク', 'spice_level': 4, 'price': 780, 'sku': 'RET-SPRK-001'},
    
    # セット商品
    {'id': 'MAE-041', 'name': '定番カレー4種セット（冷凍）', 'category': 'セット商品', 'type': 'セット', 'spice_level': 3, 'price': 3800, 'sku': 'SET-FRZ-004'},
    {'id': 'MAE-042', 'name': '激辛チャレンジ3種セット（冷凍）', 'category': 'セット商品', 'type': '激辛セット', 'spice_level': 4, 'price': 3480, 'sku': 'SET-HOT-003'},
    {'id': 'MAE-043', 'name': 'お試しレトルト6個セット', 'category': 'セット商品', 'type': 'お試しセット', 'spice_level': 3, 'price': 3980, 'sku': 'SET-RET-006'},
    {'id': 'MAE-044', 'name': '選べる定期便（月4食）', 'category': 'サブスクリプション', 'type': '定期便', 'spice_level': 0, 'price': 3600, 'sku': 'SUB-004'},
    {'id': 'MAE-045', 'name': '選べる定期便（月8食）', 'category': 'サブスクリプション', 'type': '定期便', 'spice_level': 0, 'price': 6800, 'sku': 'SUB-008'},
    
    # トッピング・関連商品
    {'id': 'MAE-061', 'name': '特製ガラムマサラ', 'category': 'トッピング', 'type': 'スパイス', 'spice_level': 0, 'price': 580, 'sku': 'TOP-GAR-001'},
    {'id': 'MAE-062', 'name': '激辛パウダー', 'category': 'トッピング', 'type': 'スパイス', 'spice_level': 5, 'price': 680, 'sku': 'TOP-HOT-001'},
    {'id': 'MAE-063', 'name': 'メーヤウ特製らっきょう', 'category': 'トッピング', 'type': '付け合わせ', 'spice_level': 0, 'price': 480, 'sku': 'TOP-RAK-001'},
]

# 顧客タイプ
CUSTOMER_TYPES = {
    'og_fan': {  # 2017年以前からのファン
        'ratio': 0.15,
        'min_orders': 20,
        'max_orders': 50,
        'min_spent': 50000,
        'max_spent': 200000,
        'tags': 'OGファン,VIP,激辛愛好家'
    },
    'revival_supporter': {  # 復活を支援した顧客
        'ratio': 0.25,
        'min_orders': 10,
        'max_orders': 30,
        'min_spent': 30000,
        'max_spent': 100000,
        'tags': '復活支援者,リピーター'
    },
    'regular': {  # 定期購入者
        'ratio': 0.20,
        'min_orders': 8,
        'max_orders': 24,
        'min_spent': 25000,
        'max_spent': 80000,
        'tags': 'サブスク会員,リピーター'
    },
    'spicy_lover': {  # 激辛愛好家
        'ratio': 0.15,
        'min_orders': 5,
        'max_orders': 15,
        'min_spent': 15000,
        'max_spent': 50000,
        'tags': '激辛愛好家'
    },
    'casual': {  # 一般顧客
        'ratio': 0.25,
        'min_orders': 1,
        'max_orders': 5,
        'min_spent': 3000,
        'max_spent': 20000,
        'tags': '一般顧客'
    }
}

# 地域データ（早稲田周辺を重視）
REGIONS = [
    {'name': '新宿区', 'city': '高田馬場', 'ratio': 0.25, 'is_local': True},
    {'name': '新宿区', 'city': '早稲田', 'ratio': 0.15, 'is_local': True},
    {'name': '文京区', 'city': '茗荷谷', 'ratio': 0.10, 'is_local': True},
    {'name': '豊島区', 'city': '池袋', 'ratio': 0.08, 'is_local': True},
    {'name': '東京都', 'city': '渋谷', 'ratio': 0.12, 'is_local': False},
    {'name': '東京都', 'city': '品川', 'ratio': 0.08, 'is_local': False},
    {'name': '神奈川県', 'city': '横浜', 'ratio': 0.07, 'is_local': False},
    {'name': '埼玉県', 'city': 'さいたま', 'ratio': 0.05, 'is_local': False},
    {'name': '千葉県', 'city': '千葉', 'ratio': 0.05, 'is_local': False},
    {'name': 'その他', 'city': '全国', 'ratio': 0.05, 'is_local': False},
]

def generate_customer_name():
    """顧客名を生成"""
    last_names = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤']
    first_names_male = ['太郎', '次郎', '健太', '翔太', '大輝', '拓也', '直樹', '誠', '隆', '浩']
    first_names_female = ['花子', '美咲', '愛', '彩', '舞', '優子', '真由美', '恵子', '幸子', '陽子']
    
    last_name = random.choice(last_names)
    if random.random() < 0.5:
        first_name = random.choice(first_names_male)
    else:
        first_name = random.choice(first_names_female)
    
    return f"{last_name}{first_name}"

def select_region():
    """確率に基づいて地域を選択"""
    rand = random.random()
    cumulative = 0
    for region in REGIONS:
        cumulative += region['ratio']
        if rand < cumulative:
            return region
    return REGIONS[-1]

def generate_customers(num_customers=200):
    """顧客データを生成"""
    customers = []
    customer_id = 4001  # Store 4の顧客は4001から
    
    for customer_type, config in CUSTOMER_TYPES.items():
        num_type_customers = int(num_customers * config['ratio'])
        
        for i in range(num_type_customers):
            name = generate_customer_name()
            region = select_region()
            
            # OGファンと復活支援者は早稲田周辺率が高い
            if customer_type in ['og_fan', 'revival_supporter']:
                if random.random() < 0.6:
                    region = random.choice([r for r in REGIONS if r['is_local']])
            
            customer = {
                'Customer ID': f'CUST-{customer_id}',
                'First Name': name[1:],
                'Last Name': name[0],
                'Email': f'maeyao-{customer_type}-{customer_id}@example.com',
                'Accepts Email Marketing': 'yes' if customer_type != 'casual' else random.choice(['yes', 'no']),
                'Company': '',
                'Address1': '',
                'Address2': '',
                'City': region['city'],
                'Province': region['name'],
                'Province Code': '',
                'Country': '日本',
                'Country Code': 'JP',
                'Zip': '',
                'Phone': f'090-{random.randint(1000,9999)}-{random.randint(1000,9999)}',
                'Accepts SMS Marketing': 'yes' if customer_type in ['og_fan', 'revival_supporter'] else 'no',
                'Total Spent': random.randint(config['min_spent'], config['max_spent']),
                'Total Orders': random.randint(config['min_orders'], config['max_orders']),
                'Tags': config['tags'],
                'Note': f'{customer_type}タイプの顧客',
                'Tax Exempt': 'no',
                'Company / 店舗名': '',
                'Industry / 業種名': '',
                'Phone': f'090-{random.randint(1000,9999)}-{random.randint(1000,9999)}',
                'Created At': '',
                'Updated At': ''
            }
            customers.append(customer)
            customer_id += 1
    
    return customers

def generate_products():
    """商品データをCSV形式に変換"""
    products_csv = []
    
    for product in CURRY_PRODUCTS:
        # 辛さレベルの星表示
        spice_stars = '★' * product['spice_level'] + '☆' * (5 - product['spice_level'])
        
        products_csv.append({
            'Handle': product['id'].lower(),
            'Title': product['name'],
            'Body (HTML)': f"<p>{product['name']}。辛さレベル: {spice_stars}</p><p>激辛だけどクセになる！早稲田メーヤウの{product['type']}カレーです。</p>",
            'Vendor': '早稲田メーヤウ',
            'Product Category': f"食品 > カレー > {product['category']}",
            'Type': product['category'],
            'Tags': f"カレー,{product['category']},{product['type']},辛さ{product['spice_level']}",
            'Published': 'TRUE',
            'Option1 Name': '',
            'Option1 Value': '',
            'Option2 Name': '',
            'Option2 Value': '',
            'Option3 Name': '',
            'Option3 Value': '',
            'Variant SKU': product['sku'],
            'Variant Grams': 300 if 'レトルト' in product['name'] else 500,
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
            'SEO Title': f"{product['name']} | 早稲田メーヤウ",
            'SEO Description': f"激辛だけどクセになる！早稲田メーヤウの{product['name']}。辛さレベル{spice_stars}",
            'Google Shopping / Google Product Category': '',
            'Metafield: custom.spice_level [number_integer]': str(product['spice_level']),
            'Metafield: custom.curry_type [single_line_text_field]': product['type'],
            'Status': 'active'
        })
    
    return products_csv

def generate_orders(customers, num_orders=800):
    """注文データを生成（閉店期間を考慮）"""
    orders = []
    order_id = 4001  # Store 4の注文は4001から
    
    # 期間設定
    # Phase 1: 2016年1月〜2017年3月（閉店前）
    phase1_start = datetime(2016, 1, 1)
    phase1_end = datetime(2017, 3, 31)
    
    # Phase 2: 2018年6月〜現在（復活後）
    phase2_start = datetime(2018, 6, 1)
    phase2_end = datetime(2025, 7, 28)
    
    # 注文の30%を閉店前、70%を復活後に配分
    phase1_orders = int(num_orders * 0.3)
    phase2_orders = num_orders - phase1_orders
    
    # 顧客タイプ別の商品選択傾向
    def select_products_for_customer(customer_tags):
        selected_products = []
        
        # 激辛愛好家
        if '激辛愛好家' in customer_tags:
            # 激辛商品を中心に選択
            spicy_products = [p for p in CURRY_PRODUCTS if p['spice_level'] >= 4]
            num_items = random.randint(2, 4)
            for _ in range(num_items):
                product = random.choice(spicy_products)
                quantity = random.randint(1, 3)
                selected_products.append((product, quantity))
        
        # サブスク会員
        elif 'サブスク会員' in customer_tags:
            # 定期便を選択
            sub_products = [p for p in CURRY_PRODUCTS if 'サブスクリプション' in p['category']]
            product = random.choice(sub_products)
            selected_products.append((product, 1))
        
        # OGファン・復活支援者
        elif any(tag in customer_tags for tag in ['OGファン', '復活支援者']):
            # バラエティ豊かに選択
            num_items = random.randint(3, 6)
            for _ in range(num_items):
                product = random.choice(CURRY_PRODUCTS)
                quantity = random.randint(1, 2)
                selected_products.append((product, quantity))
        
        # 一般顧客
        else:
            # お試しセットや定番商品
            safe_products = [p for p in CURRY_PRODUCTS if p['spice_level'] <= 3 or 'セット' in p['category']]
            num_items = random.randint(1, 2)
            for _ in range(num_items):
                product = random.choice(safe_products)
                quantity = 1
                selected_products.append((product, quantity))
        
        return selected_products
    
    # Phase 1の注文生成（閉店前）
    og_customers = [c for c in customers if 'OGファン' in c['Tags']]
    for i in range(phase1_orders):
        days_between = (phase1_end - phase1_start).days
        random_days = random.randint(0, days_between)
        order_date = phase1_start + timedelta(days=random_days)
        
        # OGファンを中心に選択
        if og_customers and random.random() < 0.7:
            customer = random.choice(og_customers)
        else:
            customer = random.choice(customers)
        
        create_order(orders, order_id, customer, order_date, select_products_for_customer)
        order_id += 1
    
    # Phase 2の注文生成（復活後）
    for i in range(phase2_orders):
        days_between = (phase2_end - phase2_start).days
        random_days = random.randint(0, days_between)
        order_date = phase2_start + timedelta(days=random_days)
        
        # 復活初期は復活支援者が多い
        if order_date < datetime(2019, 1, 1):
            revival_customers = [c for c in customers if '復活支援者' in c['Tags'] or 'OGファン' in c['Tags']]
            if revival_customers and random.random() < 0.8:
                customer = random.choice(revival_customers)
            else:
                customer = random.choice(customers)
        else:
            # 通常の顧客分布
            customer = random.choice(customers)
        
        create_order(orders, order_id, customer, order_date, select_products_for_customer)
        order_id += 1
    
    return orders

def create_order(orders, order_id, customer, order_date, product_selector):
    """個別の注文を作成"""
    selected_products = product_selector(customer['Tags'])
    
    # 注文金額を計算
    subtotal = sum(p[0]['price'] * p[1] for p in selected_products)
    shipping = 800 if subtotal < 13000 else 0  # 13,000円以上送料無料
    tax = int(subtotal * 0.1)
    total = subtotal + shipping + tax
    
    # 最初の商品で注文を作成
    first_product, first_quantity = selected_products[0]
    
    order = {
        'Name': customer['First Name'] + customer['Last Name'],
        'Email': customer['Email'],
        'Financial Status': 'paid',
        'Paid at': order_date.strftime('%Y-%m-%d %H:%M:%S +0900'),
        'Fulfillment Status': 'fulfilled',
        'Fulfilled at': (order_date + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S +0900'),
        'Currency': 'JPY',
        'Subtotal': subtotal,
        'Shipping': shipping,
        'Taxes': tax,
        'Total': total,
        'Discount Code': '',
        'Discount Amount': 0,
        'Shipping Method': '宅配便',
        'Created at': order_date.strftime('%Y-%m-%d %H:%M:%S +0900'),
        'Lineitem quantity': first_quantity,
        'Lineitem name': first_product['name'],
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
        'Notes': f"辛さレベル{first_product['spice_level']}",
        'Cancelled at': '',
        'Payment Method': 'クレジットカード',
        'Payment Reference': f'pay-4-{order_id}',
        'Refunded Amount': 0,
        'Vendor': '早稲田メーヤウ',
        'Outstanding Balance': 0,
        'Employee': '',
        'Location': '',
        'Device ID': '',
        'Id': f'ORD-{order_id}',
        'Tags': f"カレー,{first_product['type']},辛さ{first_product['spice_level']}",
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
        'Payment ID': f'pay-id-4-{order_id}',
        'Payment Terms Name': '',
        'Next Payment Due At': '',
        'Payment References': f'pay-4-{order_id}',
        'Customer ID': customer['Customer ID']
    }
    orders.append(order)
    
    # 追加の商品明細
    for product, quantity in selected_products[1:]:
        additional_item = order.copy()
        additional_item['Id'] = ''  # 同じ注文の追加明細はIDを空に
        additional_item['Lineitem quantity'] = quantity
        additional_item['Lineitem name'] = product['name']
        additional_item['Lineitem price'] = product['price']
        additional_item['Lineitem compare at price'] = int(product['price'] * 1.2)
        additional_item['Lineitem sku'] = product['sku']
        additional_item['Notes'] = f"辛さレベル{product['spice_level']}"
        additional_item['Tags'] = f"カレー,{product['type']},辛さ{product['spice_level']}"
        orders.append(additional_item)

# メイン処理
if __name__ == '__main__':
    print("早稲田メーヤウのデモデータを生成中...")
    print("ストーリー: 2017年3月閉店 → 2018年6月復活")
    
    # 顧客データ生成
    print("\n1. 顧客データを生成中...")
    customers = generate_customers(200)
    
    # 顧客データ保存
    with open(f'{output_dir}/customers_store4_maeyao.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(customers[0].keys()))
        writer.writeheader()
        writer.writerows(customers)
    print(f"   {len(customers)}件の顧客データを生成しました。")
    print(f"   - OGファン: {len([c for c in customers if 'OGファン' in c['Tags']])}名")
    print(f"   - 復活支援者: {len([c for c in customers if '復活支援者' in c['Tags']])}名")
    print(f"   - サブスク会員: {len([c for c in customers if 'サブスク会員' in c['Tags']])}名")
    
    # 商品データ生成
    print("\n2. 商品データを生成中...")
    products_csv = generate_products()
    
    # 商品データ保存
    with open(f'{output_dir}/products_store4_maeyao.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(products_csv[0].keys()))
        writer.writeheader()
        writer.writerows(products_csv)
    print(f"   {len(products_csv)}件の商品データを生成しました。")
    print(f"   - 冷凍カレー: {len([p for p in CURRY_PRODUCTS if p['category'] == '冷凍カレー'])}種")
    print(f"   - レトルトカレー: {len([p for p in CURRY_PRODUCTS if p['category'] == 'レトルトカレー'])}種")
    print(f"   - セット・サブスク: {len([p for p in CURRY_PRODUCTS if p['category'] in ['セット商品', 'サブスクリプション']])}種")
    
    # 注文データ生成
    print("\n3. 注文データを生成中...")
    orders = generate_orders(customers, 800)
    
    # 注文データ保存
    with open(f'{output_dir}/orders_store4_maeyao.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(orders[0].keys()))
        writer.writeheader()
        writer.writerows(orders)
    
    # 統計情報
    unique_orders = len(set(o['Id'] for o in orders if o['Id']))
    phase1_orders = len([o for o in orders if o['Id'] and datetime.strptime(o['Created at'], '%Y-%m-%d %H:%M:%S +0900') < datetime(2017, 4, 1)])
    phase2_orders = unique_orders - phase1_orders
    
    print(f"   {len(orders)}件の注文データ（明細含む）を生成しました。")
    print(f"   - 注文数: {unique_orders}件")
    print(f"   - 閉店前（2016-2017）: {phase1_orders}件")
    print(f"   - 復活後（2018-2025）: {phase2_orders}件")
    
    print("\n生成完了！")
    print(f"保存先: {output_dir}/")
    print("- customers_store4_maeyao.csv")
    print("- products_store4_maeyao.csv")
    print("- orders_store4_maeyao.csv")