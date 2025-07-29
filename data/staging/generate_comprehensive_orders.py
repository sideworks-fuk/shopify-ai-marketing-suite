#!/usr/bin/env python3
"""
2020年1月から2025年7月まで5年半の包括的な注文データを生成

分析画面テスト用の特徴:
1. 前年同月比【商品】画面: 商品別の月次売上変動パターン
2. 購入回数分析【購買】画面: 顧客の購入回数分布（1回、2回、3-5回、6-10回、11回以上）
3. 休眠顧客分析【顧客】画面: 90日以上購入がない顧客の発見
"""

import csv
import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

# 顧客データ（20人）
CUSTOMERS = [
    {"id": "CUST-2001", "name": "田中太郎", "email": "loyal-customer-2001@example.com", "phone": "090-1111-0001", "prefecture": "東京都", "purchase_pattern": "loyal", "target_orders": 24},
    {"id": "CUST-2002", "name": "佐藤花子", "email": "regular-customer-2002@example.com", "phone": "090-1111-0002", "prefecture": "大阪府", "purchase_pattern": "regular", "target_orders": 18},
    {"id": "CUST-2003", "name": "鈴木次郎", "email": "frequent-customer-2003@example.com", "phone": "090-1111-0003", "prefecture": "愛知県", "purchase_pattern": "frequent", "target_orders": 15},
    {"id": "CUST-2004", "name": "高橋美咲", "email": "moderate-customer-2004@example.com", "phone": "090-1111-0004", "prefecture": "神奈川県", "purchase_pattern": "moderate", "target_orders": 8},
    {"id": "CUST-2005", "name": "伊藤健一", "email": "occasional-customer-2005@example.com", "phone": "090-1111-0005", "prefecture": "千葉県", "purchase_pattern": "occasional", "target_orders": 5},
    {"id": "CUST-2006", "name": "山田由美", "email": "dormant-customer-2006@example.com", "phone": "090-1111-0006", "prefecture": "埼玉県", "purchase_pattern": "dormant", "target_orders": 3},
    {"id": "CUST-2007", "name": "渡辺雅志", "email": "one-time-customer-2007@example.com", "phone": "090-1111-0007", "prefecture": "兵庫県", "purchase_pattern": "one_time", "target_orders": 1},
    {"id": "CUST-2008", "name": "中村真理", "email": "seasonal-customer-2008@example.com", "phone": "090-1111-0008", "prefecture": "福岡県", "purchase_pattern": "seasonal", "target_orders": 6},
    {"id": "CUST-2009", "name": "小林直美", "email": "gift-customer-2009@example.com", "phone": "090-1111-0009", "prefecture": "静岡県", "purchase_pattern": "gift", "target_orders": 7},
    {"id": "CUST-2010", "name": "加藤翔太", "email": "recent-customer-2010@example.com", "phone": "090-1111-0010", "prefecture": "茨城県", "purchase_pattern": "recent", "target_orders": 4},
    {"id": "CUST-2011", "name": "森田康夫", "email": "bulk-customer-2011@example.com", "phone": "090-1111-0011", "prefecture": "栃木県", "purchase_pattern": "bulk", "target_orders": 12},
    {"id": "CUST-2012", "name": "橋本典子", "email": "spring-customer-2012@example.com", "phone": "090-1111-0012", "prefecture": "群馬県", "purchase_pattern": "spring", "target_orders": 9},
    {"id": "CUST-2013", "name": "岡田博史", "email": "comeback-customer-2013@example.com", "phone": "090-1111-0013", "prefecture": "長野県", "purchase_pattern": "comeback", "target_orders": 6},
    {"id": "CUST-2014", "name": "松本麻衣", "email": "premium-customer-2014@example.com", "phone": "090-1111-0014", "prefecture": "新潟県", "purchase_pattern": "premium", "target_orders": 11},
    {"id": "CUST-2015", "name": "野口美穂", "email": "young-customer-2015@example.com", "phone": "090-1111-0015", "prefecture": "山梨県", "purchase_pattern": "young", "target_orders": 8},
    {"id": "CUST-2016", "name": "清水孝明", "email": "holiday-customer-2016@example.com", "phone": "090-1111-0016", "prefecture": "岐阜県", "purchase_pattern": "holiday", "target_orders": 5},
    {"id": "CUST-2017", "name": "藤田理恵", "email": "trial-customer-2017@example.com", "phone": "090-1111-0017", "prefecture": "三重県", "purchase_pattern": "trial", "target_orders": 2},
    {"id": "CUST-2018", "name": "石田健二", "email": "consistent-customer-2018@example.com", "phone": "090-1111-0018", "prefecture": "滋賀県", "purchase_pattern": "consistent", "target_orders": 13},
    {"id": "CUST-2019", "name": "坂本奈々", "email": "weekend-customer-2019@example.com", "phone": "090-1111-0019", "prefecture": "京都府", "purchase_pattern": "weekend", "target_orders": 6},
    {"id": "CUST-2020", "name": "山本智子", "email": "event-customer-2020@example.com", "phone": "090-1111-0020", "prefecture": "奈良県", "purchase_pattern": "event", "target_orders": 7},
]

# 商品データ（SKU別）
PRODUCTS = [
    {"sku": "PRD-2001-L", "name": "プレミアムギフトボックスセット L", "price": 15000, "vendor": "ギフト工房", "category": "premium"},
    {"sku": "PRD-2001-M", "name": "プレミアムギフトボックスセット M", "price": 12000, "vendor": "ギフト工房", "category": "premium"},
    {"sku": "PRD-2001-S", "name": "プレミアムギフトボックスセット S", "price": 8000, "vendor": "ギフト工房", "category": "premium"},
    {"sku": "PRD-2002-SP", "name": "季節限定コレクション 春", "price": 5000, "vendor": "季節工房", "category": "seasonal"},
    {"sku": "PRD-2002-SU", "name": "季節限定コレクション 夏", "price": 5500, "vendor": "季節工房", "category": "seasonal"},
    {"sku": "PRD-2002-AU", "name": "季節限定コレクション 秋", "price": 6000, "vendor": "季節工房", "category": "seasonal"},
    {"sku": "PRD-2002-WI", "name": "季節限定コレクション 冬", "price": 6500, "vendor": "季節工房", "category": "seasonal"},
    {"sku": "PRD-2003-BA", "name": "デイリーエッセンシャル ベーシック", "price": 2000, "vendor": "生活工房", "category": "daily"},
    {"sku": "PRD-2003-ST", "name": "デイリーエッセンシャル スタンダード", "price": 3000, "vendor": "生活工房", "category": "daily"},
    {"sku": "PRD-2003-PR", "name": "デイリーエッセンシャル プレミアム", "price": 4000, "vendor": "生活工房", "category": "daily"},
    {"sku": "PRD-2004-GO", "name": "ラグジュアリーアイテム ゴールド", "price": 25000, "vendor": "高級工房", "category": "luxury"},
    {"sku": "PRD-2004-PL", "name": "ラグジュアリーアイテム プラチナ", "price": 35000, "vendor": "高級工房", "category": "luxury"},
    {"sku": "PRD-2005-BA", "name": "テックガジェット ベーシック", "price": 8000, "vendor": "テック工房", "category": "tech"},
    {"sku": "PRD-2005-AD", "name": "テックガジェット アドバンス", "price": 12000, "vendor": "テック工房", "category": "tech"},
    {"sku": "PRD-2006-RE", "name": "ヘルス＆ウェルネス リラックス", "price": 6000, "vendor": "ウェルネス工房", "category": "health"},
    {"sku": "PRD-2006-EN", "name": "ヘルス＆ウェルネス エナジー", "price": 7000, "vendor": "ウェルネス工房", "category": "health"},
    {"sku": "PRD-2007-XM", "name": "ホリデースペシャル クリスマス", "price": 9000, "vendor": "ホリデー工房", "category": "holiday"},
    {"sku": "PRD-2007-VD", "name": "ホリデースペシャル バレンタイン", "price": 8000, "vendor": "ホリデー工房", "category": "holiday"},
    {"sku": "PRD-2007-MD", "name": "ホリデースペシャル 母の日", "price": 7000, "vendor": "ホリデー工房", "category": "holiday"},
    {"sku": "PRD-2008-RC", "name": "エコフレンドリー リサイクル", "price": 4500, "vendor": "エコ工房", "category": "eco"},
    {"sku": "PRD-2008-OR", "name": "エコフレンドリー オーガニック", "price": 5500, "vendor": "エコ工房", "category": "eco"},
    {"sku": "PRD-2009-36", "name": "キッズコレクション 3-6歳", "price": 3500, "vendor": "キッズ工房", "category": "kids"},
    {"sku": "PRD-2009-712", "name": "キッズコレクション 7-12歳", "price": 4000, "vendor": "キッズ工房", "category": "kids"},
    {"sku": "PRD-2010-RU", "name": "スポーツ＆アウトドア ランニング", "price": 6500, "vendor": "スポーツ工房", "category": "sports"},
    {"sku": "PRD-2010-HI", "name": "スポーツ＆アウトドア ハイキング", "price": 8000, "vendor": "スポーツ工房", "category": "sports"},
    {"sku": "PRD-2011-TR", "name": "職人クラフト 伝統", "price": 12000, "vendor": "職人工房", "category": "craft"},
    {"sku": "PRD-2011-MO", "name": "職人クラフト モダン", "price": 10000, "vendor": "職人工房", "category": "craft"},
]

def generate_order_dates(customer: Dict, start_date: datetime, end_date: datetime) -> List[datetime]:
    """顧客の購買パターンに応じた注文日を生成"""
    dates = []
    current_date = start_date
    
    pattern = customer["purchase_pattern"]
    target_orders = customer["target_orders"]
    
    if pattern == "loyal":
        # 月2回程度、安定的に購入
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(12, 20))
            
    elif pattern == "regular":
        # 月1.5回程度、やや安定
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(18, 25))
            
    elif pattern == "frequent":
        # 月1回程度、定期的
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(25, 35))
            
    elif pattern == "moderate":
        # 2-3ヶ月に1回
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(60, 90))
            
    elif pattern == "occasional":
        # 4-6ヶ月に1回
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(120, 180))
            
    elif pattern == "dormant":
        # 最初の3回の後、長期休眠
        for i in range(min(3, target_orders)):
            if current_date >= datetime(2023, 12, 31):
                break
            dates.append(current_date)
            if i < 2:
                current_date += timedelta(days=random.randint(30, 60))
            else:
                # 2023年8月以降は購入なし（休眠）
                current_date = datetime(2023, 8, 15)
                
    elif pattern == "one_time":
        # 一回だけ購入
        dates.append(datetime(2021, 1, 20) + timedelta(hours=random.randint(0, 23)))
        
    elif pattern == "seasonal":
        # 年末年始のみ購入
        for year in range(2020, 2026):
            if len(dates) >= target_orders:
                break
            # 12月購入
            dec_date = datetime(year, 12, random.randint(1, 25))
            if dec_date <= end_date:
                dates.append(dec_date)
                
    elif pattern == "gift":
        # イベント時に購入（母の日、バレンタイン等）
        events = [
            (2, 14),  # バレンタイン
            (5, 10),  # 母の日
            (12, 20), # クリスマス
        ]
        for year in range(2021, 2026):
            for month, day in events:
                if len(dates) >= target_orders:
                    break
                event_date = datetime(year, month, day)
                if event_date <= end_date:
                    dates.append(event_date)
                    
    elif pattern == "recent":
        # 2024年以降の新規顧客
        start_recent = datetime(2024, 1, 15)
        for _ in range(target_orders):
            if start_recent >= end_date:
                break
            dates.append(start_recent)
            start_recent += timedelta(days=random.randint(30, 60))
            
    elif pattern == "bulk":
        # まとめ買い（3ヶ月おき、大量購入）
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(80, 100))
            
    elif pattern == "spring":
        # 春に集中購入
        for year in range(2021, 2026):
            for month in [3, 4, 5]:
                if len(dates) >= target_orders:
                    break
                spring_date = datetime(year, month, random.randint(1, 28))
                if spring_date <= end_date:
                    dates.append(spring_date)
                    
    elif pattern == "comeback":
        # 長期間空いた後に復帰
        # 2020年後半に数回、その後2025年初頭に復帰
        dates.append(datetime(2020, 8, 30))
        dates.append(datetime(2020, 11, 15))
        dates.append(datetime(2021, 2, 10))
        dates.append(datetime(2025, 1, 25))
        dates.append(datetime(2025, 4, 15))
        dates.append(datetime(2025, 7, 10))
        
    elif pattern == "premium":
        # 高価格商品を定期的に購入
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(45, 65))
            
    elif pattern == "young":
        # 2022年以降の若年層、SNS経由
        start_young = datetime(2022, 6, 10)
        for _ in range(target_orders):
            if start_young >= end_date:
                break
            dates.append(start_young)
            start_young += timedelta(days=random.randint(60, 90))
            
    elif pattern == "holiday":
        # 祝日・連休に購入
        holidays = [
            (11, 25),  # 勤労感謝の日付近
            (4, 29),   # GW
            (8, 15),   # お盆
        ]
        for year in range(2020, 2026):
            for month, day in holidays:
                if len(dates) >= target_orders:
                    break
                holiday_date = datetime(year, month, day)
                if holiday_date <= end_date:
                    dates.append(holiday_date)
                    
    elif pattern == "trial":
        # 試しに少し購入
        dates.append(datetime(2023, 9, 15))
        dates.append(datetime(2024, 2, 10))
        
    elif pattern == "consistent":
        # 月1回、非常に安定
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            dates.append(current_date)
            current_date += timedelta(days=random.randint(28, 32))
            
    elif pattern == "weekend":
        # 週末に購入
        for _ in range(target_orders):
            if current_date >= end_date:
                break
            # 週末に調整
            while current_date.weekday() not in [5, 6]:  # 土日
                current_date += timedelta(days=1)
            dates.append(current_date)
            current_date += timedelta(days=random.randint(45, 75))
            
    elif pattern == "event":
        # イベント・記念日購入
        for year in range(2020, 2026):
            events = [
                datetime(year, 10, 12),  # 記念日
                datetime(year, 6, 20),   # 父の日
                datetime(year, 3, 15),   # ホワイトデー
            ]
            for event_date in events:
                if len(dates) >= target_orders:
                    break
                if event_date <= end_date:
                    dates.append(event_date)
    
    return sorted([d for d in dates if d <= end_date])

def select_product_for_customer(customer: Dict, order_date: datetime) -> Dict:
    """顧客と注文日に応じて商品を選択"""
    pattern = customer["purchase_pattern"]
    
    if pattern == "loyal":
        # プレミアム商品を好む
        return random.choice([p for p in PRODUCTS if p["category"] in ["premium", "luxury"]])
    elif pattern == "regular":
        # 季節商品とギフト商品
        return random.choice([p for p in PRODUCTS if p["category"] in ["seasonal", "holiday"]])
    elif pattern == "frequent":
        # 季節商品を定期購入
        season_products = [p for p in PRODUCTS if p["category"] == "seasonal"]
        if order_date.month in [3, 4, 5]:
            return [p for p in season_products if "春" in p["name"]][0]
        elif order_date.month in [6, 7, 8]:
            return [p for p in season_products if "夏" in p["name"]][0]
        elif order_date.month in [9, 10, 11]:
            return [p for p in season_products if "秋" in p["name"]][0]
        else:
            return [p for p in season_products if "冬" in p["name"]][0]
    elif pattern in ["moderate", "occasional"]:
        # 日用品中心
        return random.choice([p for p in PRODUCTS if p["category"] == "daily"])
    elif pattern == "dormant":
        # ヘルス＆ウェルネス商品
        return random.choice([p for p in PRODUCTS if p["category"] == "health"])
    elif pattern == "one_time":
        # 高価格ギフト商品
        return [p for p in PRODUCTS if p["sku"] == "PRD-2001-L"][0]
    elif pattern == "seasonal":
        # クリスマス商品
        return [p for p in PRODUCTS if "クリスマス" in p["name"]][0]
    elif pattern == "gift":
        # イベント商品
        if order_date.month == 2:
            return [p for p in PRODUCTS if "バレンタイン" in p["name"]][0]
        elif order_date.month == 5:
            return [p for p in PRODUCTS if "母の日" in p["name"]][0]
        else:
            return [p for p in PRODUCTS if "クリスマス" in p["name"]][0]
    elif pattern == "recent":
        # 手頃な日用品
        return [p for p in PRODUCTS if p["sku"] == "PRD-2003-BA"][0]
    elif pattern == "bulk":
        # まとめ買い用の日用品
        return [p for p in PRODUCTS if p["sku"] == "PRD-2003-BA"][0]
    elif pattern == "spring":
        # 春商品
        return [p for p in PRODUCTS if "春" in p["name"]][0]
    elif pattern == "comeback":
        # 季節商品
        if order_date.month in [8, 9]:
            return [p for p in PRODUCTS if "夏" in p["name"]][0]
        else:
            return random.choice([p for p in PRODUCTS if p["category"] == "seasonal"])
    elif pattern == "premium":
        # 高級商品
        return random.choice([p for p in PRODUCTS if p["category"] == "luxury"])
    elif pattern == "young":
        # キッズ・若年層向け
        return random.choice([p for p in PRODUCTS if p["category"] in ["kids", "eco"]])
    elif pattern == "holiday":
        # ホリデー商品
        return [p for p in PRODUCTS if "クリスマス" in p["name"]][0]
    elif pattern == "trial":
        # 安価な商品
        return [p for p in PRODUCTS if p["sku"] == "PRD-2003-BA"][0]
    elif pattern == "consistent":
        # 安定した日用品
        return random.choice([p for p in PRODUCTS if p["category"] == "daily"])
    elif pattern == "weekend":
        # エコ商品
        return random.choice([p for p in PRODUCTS if p["category"] == "eco"])
    elif pattern == "event":
        # 工芸品
        return random.choice([p for p in PRODUCTS if p["category"] == "craft"])
    
    # デフォルト
    return random.choice(PRODUCTS)

def calculate_quantity(customer: Dict, product: Dict) -> int:
    """顧客パターンに応じた購入数量"""
    if customer["purchase_pattern"] == "bulk":
        return random.randint(3, 8)  # まとめ買い
    elif customer["purchase_pattern"] in ["loyal", "premium"]:
        return random.randint(1, 3)  # 高価値顧客は複数購入
    else:
        return 1  # 通常は1個

def generate_order_csv():
    """注文データCSVを生成"""
    orders = []
    order_id_counter = 2021
    
    start_date = datetime(2020, 1, 1)
    end_date = datetime(2025, 7, 31)
    
    # 各顧客の注文を生成
    for customer in CUSTOMERS:
        order_dates = generate_order_dates(customer, start_date, end_date)
        
        for order_date in order_dates:
            product = select_product_for_customer(customer, order_date)
            quantity = calculate_quantity(customer, product)
            
            subtotal = product["price"] * quantity
            shipping = 300 if subtotal < 5000 else (500 if subtotal < 10000 else 800)
            taxes = int(subtotal * 0.1)
            total = subtotal + shipping + taxes
            
            # 注文データ作成
            order = {
                "Name": customer["name"],
                "Email": customer["email"],
                "Financial Status": "paid",
                "Paid at": order_date.strftime("%Y-%m-%d %H:%M:%S +0900"),
                "Fulfillment Status": "fulfilled",
                "Fulfilled at": (order_date + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S +0900"),
                "Currency": "JPY",
                "Subtotal": subtotal,
                "Shipping": shipping,
                "Taxes": taxes,
                "Total": total,
                "Discount Code": "",
                "Discount Amount": 0,
                "Shipping Method": "宅配便",
                "Created at": order_date.strftime("%Y-%m-%d %H:%M:%S +0900"),
                "Lineitem quantity": quantity,
                "Lineitem name": product["name"],
                "Lineitem price": product["price"],
                "Lineitem compare at price": product["price"],
                "Lineitem sku": product["sku"],
                "Lineitem requires shipping": "true",
                "Lineitem taxable": "true",
                "Lineitem fulfillment status": "fulfilled",
                "Billing Name": customer["name"],
                "Billing Street": "",
                "Billing Address1": "",
                "Billing Address2": "",
                "Billing Company": "",
                "Billing City": customer["prefecture"],
                "Billing Zip": "",
                "Billing Province": customer["prefecture"],
                "Billing Country": "日本",
                "Billing Phone": customer["phone"],
                "Shipping Name": customer["name"],
                "Shipping Street": "",
                "Shipping Address1": "",
                "Shipping Address2": "",
                "Shipping Company": "",
                "Shipping City": customer["prefecture"],
                "Shipping Zip": "",
                "Shipping Province": customer["prefecture"],
                "Shipping Country": "日本",
                "Shipping Phone": customer["phone"],
                "Notes": f"{customer['purchase_pattern']}パターン",
                "Cancelled at": "",
                "Payment Method": "Shopify Payments",
                "Payment Reference": f"pay-{customer['id'][-4:]}-{order_id_counter:03d}",
                "Refunded Amount": 0,
                "Vendor": product["vendor"],
                "Outstanding Balance": 0,
                "Employee": "",
                "Location": "",
                "Device ID": "",
                "Id": f"ORD-{order_id_counter}",
                "Tags": f"{customer['purchase_pattern']},テスト顧客",
                "Risk Level": "Low",
                "Source": "web",
                "Lineitem discount": 0,
                "Tax 1 Name": "消費税 10%",
                "Tax 1 Value": taxes,
                "Tax 2 Name": "",
                "Tax 2 Value": "",
                "Tax 3 Name": "",
                "Tax 3 Value": "",
                "Tax 4 Name": "",
                "Tax 4 Value": "",
                "Tax 5 Name": "",
                "Tax 5 Value": "",
                "Phone": "",
                "Receipt Number": "",
                "Duties": "",
                "Billing Province Name": customer["prefecture"],
                "Shipping Province Name": customer["prefecture"],
                "Payment ID": f"pay-id-{customer['id'][-4:]}-{order_id_counter:03d}",
                "Payment Terms Name": "",
                "Next Payment Due At": "",
                "Payment References": f"pay-{customer['id'][-4:]}-{order_id_counter:03d}",
                "Customer ID": customer["id"]
            }
            
            orders.append(order)
            order_id_counter += 1
    
    return orders

def main():
    """メイン関数"""
    print("2020年1月〜2025年7月の包括的注文データを生成中...")
    
    orders = generate_order_csv()
    
    # CSVファイルに出力
    filename = "/mnt/c/source/git-h.fukuda1207/shopify-ai-marketing-suite/data/staging/anonymized-orders_store2_comprehensive.csv"
    
    if orders:
        fieldnames = orders[0].keys()
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(orders)
        
        print(f"✅ {len(orders)}件の注文データを生成: {filename}")
        
        # 統計情報を出力
        customer_order_counts = {}
        for order in orders:
            customer_id = order["Customer ID"]
            customer_order_counts[customer_id] = customer_order_counts.get(customer_id, 0) + 1
        
        print("\n📊 顧客別注文数統計:")
        for customer in CUSTOMERS:
            count = customer_order_counts.get(customer["id"], 0)
            print(f"  {customer['name']} ({customer['purchase_pattern']}): {count}回 (目標: {customer['target_orders']}回)")
        
        print(f"\n📈 期間: 2020年1月 〜 2025年7月 (5年7ヶ月)")
        print(f"🏪 顧客数: {len(CUSTOMERS)}人")
        print(f"📦 商品数: {len(PRODUCTS)}商品")
        print(f"🛒 総注文数: {len(orders)}件")
        
    else:
        print("❌ 注文データの生成に失敗しました")

if __name__ == "__main__":
    main()