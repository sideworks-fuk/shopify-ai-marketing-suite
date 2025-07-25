// 統一商品リスト（全画面で使用）
export interface SampleProduct {
  id: string
  name: string
  category: string
  description?: string
  price?: number
}

// 統一商品データ（実際のShopify商品名を使用）
export const SAMPLE_PRODUCTS: SampleProduct[] = [
  // デコ箱・ケーキ系
  { id: '1', name: 'ナチュラルグレーデコ箱5号H150', category: 'deco_box', price: 1200 },
  { id: '2', name: 'エコクラフトデコ箱4号H130', category: 'deco_box', price: 950 },
  { id: '3', name: 'エコクラフトデコ箱5号H150', category: 'deco_box', price: 1100 },
  { id: '4', name: 'ナチュラルグレーデコ箱4号H130', category: 'deco_box', price: 850 },
  { id: '5', name: 'UNIエコクラフトデコ箱7号H80', category: 'deco_box', price: 1450 },
  { id: '6', name: 'エコクラフトデコ箱7号H150', category: 'deco_box', price: 1650 },
  { id: '7', name: 'Criollo-Bitter-デコ箱4号H130', category: 'deco_box', price: 980 },
  { id: '8', name: 'UNIエコクラフトデコ箱5号H80', category: 'deco_box', price: 1050 },
  { id: '9', name: 'エコクラフトデコ箱6号H150', category: 'deco_box', price: 1350 },
  { id: '10', name: 'ナチュラルグレーデコ箱5号H80', category: 'deco_box', price: 980 },
  { id: '11', name: 'ナチュラルグレーデコ箱5号H113', category: 'deco_box', price: 1050 },
  { id: '12', name: 'ナチュラルグレーデコ箱4号H80', category: 'deco_box', price: 780 },
  { id: '13', name: 'Criollo-Bitter-デコ箱6号H150', category: 'deco_box', price: 1380 },
  { id: '14', name: 'ナチュラルグレーデコ箱6号H125', category: 'deco_box', price: 1250 },
  { id: '15', name: 'エコクラフトデコ箱4.5号H130', category: 'deco_box', price: 1000 },

  // 白ムジデコ箱系
  { id: '16', name: '白ムジデコ箱4号H130', category: 'white_box', price: 920 },
  { id: '17', name: '白ムジデコ箱5号H150', category: 'white_box', price: 1180 },
  { id: '18', name: '白ムジデコ箱6号H200', category: 'white_box', price: 1580 },
  { id: '19', name: '白ムジデコ箱5号H200', category: 'white_box', price: 1380 },
  { id: '20', name: '白ムジデコ箱7号H200', category: 'white_box', price: 1780 },
  { id: '21', name: '白ムジデコ箱5号H130', category: 'white_box', price: 1050 },
  { id: '22', name: '白ムジデコ箱6号H150', category: 'white_box', price: 1350 },
  { id: '23', name: '白ムジデコ箱7号H150', category: 'white_box', price: 1650 },
  { id: '24', name: '白ムジ トールデコ箱6号H300', category: 'white_box', price: 2100 },

  // カットケーキ箱系
  { id: '25', name: 'UNIエコクラフトカットケーキ箱1号SS', category: 'cut_cake_box', price: 480 },
  { id: '26', name: 'UNIエコクラフトカットケーキ箱2号S', category: 'cut_cake_box', price: 580 },
  { id: '27', name: 'nwカットケーキ箱1号SS', category: 'cut_cake_box', price: 450 },
  { id: '28', name: 'nwカットケーキ箱2号S', category: 'cut_cake_box', price: 520 },
  { id: '29', name: 'nwカットケーキ箱3号M', category: 'cut_cake_box', price: 680 },
  { id: '30', name: 'UNIエコクラフトカットケーキ箱3号M', category: 'cut_cake_box', price: 720 },
  { id: '31', name: 'nwカットケーキ箱4号L', category: 'cut_cake_box', price: 850 },
  { id: '32', name: 'UNIエコクラフトカットケーキ箱4号L', category: 'cut_cake_box', price: 890 },
  { id: '33', name: 'nwカットケーキ箱1号SS_N式_H85', category: 'cut_cake_box', price: 520 },
  { id: '34', name: 'nwカットケーキ箱2号S_N式_H85', category: 'cut_cake_box', price: 580 },
  { id: '35', name: 'nwカットケーキ箱0.5号SSS_N式_H85', category: 'cut_cake_box', price: 420 },

  // パウンドケーキ箱系
  { id: '36', name: 'パウンドケーキ箱(チャコール)', category: 'pound_cake_box', price: 650 },
  { id: '37', name: 'パウンドケーキ箱S(ニュートラルグレー)', category: 'pound_cake_box', price: 580 },
  { id: '38', name: 'パウンドケーキ箱S(ライトプルーフ)', category: 'pound_cake_box', price: 620 },
  { id: '39', name: 'パウンドケーキ箱(ニュートラルグレー)', category: 'pound_cake_box', price: 680 },
  { id: '40', name: 'nwパウンドケーキ箱(ホワイト)', category: 'pound_cake_box', price: 600 },
  { id: '41', name: 'パウンドケーキ箱(クラフト)', category: 'pound_cake_box', price: 590 },
  { id: '42', name: 'パウンドケーキ箱S(チャコール)', category: 'pound_cake_box', price: 560 },
  { id: '43', name: 'nwパウンドケーキ箱S(ホワイト)', category: 'pound_cake_box', price: 540 },
  { id: '44', name: 'パウンドケーキ箱(ミストグレー)', category: 'pound_cake_box', price: 630 },
  { id: '45', name: 'スリムパウンドケーキ箱(ミストグレー)', category: 'pound_cake_box', price: 520 },

  // ギフトボックス系
  { id: '46', name: 'ギフトボックスM(ナチュラルグレー)', category: 'gift_box', price: 780 },
  { id: '47', name: 'ギフトボックス(ミストグレー)', category: 'gift_box', price: 850 },
  { id: '48', name: 'ギフトボックス(ライトプルーフ)', category: 'gift_box', price: 820 },
  { id: '49', name: 'ギフトボックスL(レモンイエロー)', category: 'gift_box', price: 980 },
  { id: '50', name: 'ギフトボックスL(ダークグレー)', category: 'gift_box', price: 950 },
  { id: '51', name: 'ギフトボックスM(ダークグレー)', category: 'gift_box', price: 800 },
  { id: '52', name: 'ギフトボックスM(エコクラフト)', category: 'gift_box', price: 760 },
  { id: '53', name: 'nwギフトボックス(ホワイト)', category: 'gift_box', price: 720 },
  { id: '54', name: 'ギフトボックス(ニュートラルグレー)', category: 'gift_box', price: 870 },
  { id: '55', name: 'ギフトボックスM(レモンイエロー)', category: 'gift_box', price: 790 },
  { id: '56', name: 'ギフトボックスM(ホワイト)', category: 'gift_box', price: 750 },
  { id: '57', name: 'ギフトボックス(チャコール)', category: 'gift_box', price: 880 },
  { id: '58', name: 'ギフトボックス(ブルーグレー)', category: 'gift_box', price: 890 },
  { id: '59', name: 'ギフトボックスL(フランボワーズ)', category: 'gift_box', price: 1020 },

  // プラトレー系
  { id: '60', name: 'プラトレー6号サイズ(ホワイト)', category: 'tray', price: 320 },
  { id: '61', name: 'プラトレー4号サイズ(ホワイト)', category: 'tray', price: 280 },
  { id: '62', name: 'プラトレー5号サイズ(ホワイト)', category: 'tray', price: 300 },
  { id: '63', name: 'プラトレー7号サイズ(ホワイト)', category: 'tray', price: 350 },
  { id: '64', name: 'プラトレー4号サイズ(ゴールド)', category: 'tray', price: 320 },
  { id: '65', name: 'プラトレー5号サイズ(ゴールド)', category: 'tray', price: 340 },
  { id: '66', name: 'プラトレー6号サイズ(ゴールド)', category: 'tray', price: 360 },
  { id: '67', name: 'プラトレー3号サイズ(ゴールド)', category: 'tray', price: 260 },
  { id: '68', name: 'プラトレー8号サイズ(ホワイト)', category: 'tray', price: 380 },
  { id: '69', name: 'プラトレー4.5号サイズ(ホワイト)', category: 'tray', price: 290 },

  // 紙トレー系
  { id: '70', name: 'nw紙トレー丸5号(ホワイト)', category: 'paper_tray', price: 240 },
  { id: '71', name: '紙トレー4号サイズ(ゴールド)', category: 'paper_tray', price: 220 },
  { id: '72', name: '紙トレー5号サイズ(ゴールド)', category: 'paper_tray', price: 250 },
  { id: '73', name: '紙トレー7号サイズ(ゴールド)', category: 'paper_tray', price: 280 },
  { id: '74', name: 'nw紙トレー角5号(ホワイト)', category: 'paper_tray', price: 260 },
  { id: '75', name: 'nw紙トレー角6号(ホワイト)', category: 'paper_tray', price: 290 },
  { id: '76', name: 'nw紙トレー丸4号(ホワイト)', category: 'paper_tray', price: 210 },
  { id: '77', name: 'nw紙トレー角4号(ホワイト)', category: 'paper_tray', price: 200 },
  { id: '78', name: 'nw紙トレー丸6号(ホワイト)', category: 'paper_tray', price: 270 },
  { id: '79', name: '紙トレー角5号(ナチュラルグレー)', category: 'paper_tray', price: 280 },

  // 紙袋系
  { id: '80', name: '紙袋　クラフトNo.1', category: 'paper_bag', price: 180 },
  { id: '81', name: '紙袋 クラフト(パウンド・ロール用)No.1', category: 'paper_bag', price: 150 },
  { id: '82', name: '紙袋 RP ナチュラルグレー', category: 'paper_bag', price: 220 },
  { id: '83', name: '紙袋 M ナチュラルグレー', category: 'paper_bag', price: 200 },
  { id: '84', name: '紙袋 S ナチュラルグレー', category: 'paper_bag', price: 170 },
  { id: '85', name: '紙袋 L ナチュラルグレー', category: 'paper_bag', price: 250 },
  { id: '86', name: '紙袋 ホワイト(パウンド・ロール用)No.1', category: 'paper_bag', price: 160 },
  { id: '87', name: '紙袋 H平181 ショコラ', category: 'paper_bag', price: 190 },
  { id: '88', name: '紙袋 HV68 クラフト', category: 'paper_bag', price: 210 },
  { id: '89', name: '紙袋 クラフト85', category: 'paper_bag', price: 175 },

  // 透明バッグ・包装材系
  { id: '90', name: '透明バッグ M', category: 'packaging', price: 120 },
  { id: '91', name: '透明バッグ L', category: 'packaging', price: 150 },
  { id: '92', name: '透明バッグ LL', category: 'packaging', price: 180 },
  { id: '93', name: '透明バッグ S', category: 'packaging', price: 100 },
  { id: '94', name: 'イーグリップ S クラフト', category: 'packaging', price: 80 },
  { id: '95', name: 'イーグリップ M クラフト', category: 'packaging', price: 120 },
  { id: '96', name: 'イーグリップ LL クラフト', category: 'packaging', price: 200 },
  { id: '97', name: '手抜きスタンドパック クラフト 40-3', category: 'packaging', price: 180 },
  { id: '98', name: '手抜きスタンドパック クラフト 40-2', category: 'packaging', price: 170 },
  { id: '99', name: '角底袋 クラフト H200_100入', category: 'packaging', price: 2800 },
  { id: '100', name: '角底袋 クラフト H300_100入', category: 'packaging', price: 3200 },

  // ダンボール・配送系
  { id: '101', name: 'hacobo! 宅配・輸送用ダンボール(60サイズ用)', category: 'shipping', price: 320 },
  { id: '102', name: 'hacobo! デコ箱6号用ダンボール_BF', category: 'shipping', price: 280 },
  { id: '103', name: 'hacobo! ギフト発送用ダンボール(60サイズ用)', category: 'shipping', price: 350 },
  { id: '104', name: 'hacobo!宅配用ダンボール(60サイズ用)_ケーキ', category: 'shipping', price: 380 },
  { id: '105', name: '宅配用ダンボール(ケーキ) 内寸240×240×230', category: 'shipping', price: 420 },
  { id: '106', name: 'hacobo! デコ箱5号用ダンボール_BF', category: 'shipping', price: 260 },
  { id: '107', name: 'hacobo! デコ箱7号用ダンボール_BF', category: 'shipping', price: 300 },

  // 特殊商品・その他
  { id: '108', name: 'ホールケーキフィルムアクア 60×600_100入り', category: 'specialty', price: 1800 },
  { id: '109', name: 'UNIライトプルーフ5号H65', category: 'specialty', price: 680 },
  { id: '110', name: 'UNIライトプルーフ4号H60', category: 'specialty', price: 620 },
  { id: '111', name: 'nwホワイト5号H65', category: 'specialty', price: 650 },
  { id: '112', name: 'nwホワイト4号H60', category: 'specialty', price: 590 },
  { id: '113', name: 'nwホワイト6号H65', category: 'specialty', price: 720 },
  { id: '114', name: 'カラートレー 165 ブラウン', category: 'specialty', price: 380 },
  { id: '115', name: 'IK トレー 165 浅蓋', category: 'specialty', price: 420 },

  // ロールケーキ箱系
  { id: '116', name: 'UNIエコクラフトロールケーキ箱', category: 'roll_cake_box', price: 580 },
  { id: '117', name: 'エコクラフトロールケーキ箱H150', category: 'roll_cake_box', price: 620 },
  { id: '118', name: 'nwロールケーキ箱_N式', category: 'roll_cake_box', price: 550 },
  { id: '119', name: 'UNIナチュラルグレーロールケーキ箱', category: 'roll_cake_box', price: 600 },
  { id: '120', name: 'ルージュロールケーキ箱H150', category: 'roll_cake_box', price: 650 },

  // 保冷・アクセサリー系
  { id: '121', name: '保冷バッグ(取っ手白)小', category: 'accessories', price: 450 },
  { id: '122', name: '保冷バッグ(取っ手黒)大', category: 'accessories', price: 680 },
  { id: '123', name: '保冷剤30g', category: 'accessories', price: 80 },
  { id: '124', name: 'デザートカップ トール', category: 'accessories', price: 120 },
  { id: '125', name: 'ケーキピック オペラ', category: 'accessories', price: 25 },

  // シール・装飾系
  { id: '126', name: '母の日シール ソフトメッセージ(48片×1束)_48枚', category: 'decoration', price: 480 },
  { id: '127', name: '掛け紙_クリスマスレッド_70×525mm', category: 'decoration', price: 150 },
  { id: '128', name: '掛け紙_クリスマスリース_60×360mm', category: 'decoration', price: 130 },
  { id: '129', name: 'バレンタインシール 34×34mm(5×8片)', category: 'decoration', price: 280 },
  { id: '130', name: 'ホワイトデーシール ツインハートB(3柄×12片×10束)_360枚', category: 'decoration', price: 1200 },
]

// カテゴリー定義（実際の商品カテゴリーに合わせて更新）
export const PRODUCT_CATEGORIES = [
  { id: 'deco_box', name: 'デコ箱・ケーキ箱', color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
  { id: 'white_box', name: '白ムジ箱', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  { id: 'cut_cake_box', name: 'カットケーキ箱', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  { id: 'pound_cake_box', name: 'パウンドケーキ箱', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  { id: 'gift_box', name: 'ギフトボックス', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { id: 'tray', name: 'プラトレー', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { id: 'paper_tray', name: '紙トレー', color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
  { id: 'paper_bag', name: '紙袋', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  { id: 'packaging', name: '包装材・バッグ', color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  { id: 'shipping', name: 'ダンボール・配送', color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  { id: 'roll_cake_box', name: 'ロールケーキ箱', color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-800' },
  { id: 'specialty', name: 'フィルム・特殊容器', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  { id: 'accessories', name: '保冷材・アクセサリー', color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-800' },
  { id: 'decoration', name: 'シール・装飾品', color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-800' },
]

// 人気商品の取得（販売数量を想定した価格順）
export const getTopProducts = (count: number = 20): SampleProduct[] => {
  return SAMPLE_PRODUCTS
    .slice(0, count)
}

// 売上上位商品の取得（価格が高い順）
export const getHighValueProducts = (count: number = 10): SampleProduct[] => {
  return SAMPLE_PRODUCTS
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, count)
}

// カテゴリー別商品の取得
export const getProductsByCategory = (categoryId: string): SampleProduct[] => {
  return SAMPLE_PRODUCTS.filter(product => product.category === categoryId)
}

// ランダム商品の取得
export const getRandomProducts = (count: number = 10): SampleProduct[] => {
  const shuffled = [...SAMPLE_PRODUCTS].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// カテゴリー名の取得
export const getCategoryName = (categoryId: string): string => {
  const category = PRODUCT_CATEGORIES.find(cat => cat.id === categoryId)
  return category ? category.name : 'その他'
}

// 商品をIDで取得
export const getProductById = (id: string): SampleProduct | undefined => {
  return SAMPLE_PRODUCTS.find(product => product.id === id)
}

// 価格帯別商品の取得
export const getProductsByPriceRange = (minPrice: number, maxPrice: number): SampleProduct[] => {
  return SAMPLE_PRODUCTS.filter(product => 
    product.price && product.price >= minPrice && product.price <= maxPrice
  )
}

// カテゴリースタイルの取得
export const getCategoryStyle = (categoryId: string) => {
  const category = PRODUCT_CATEGORIES.find(cat => cat.id === categoryId)
  return category ? {
    name: category.name,
    color: category.color,
    bgColor: category.bgColor,
    textColor: category.textColor
  } : {
    name: 'その他',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800'
  }
} 