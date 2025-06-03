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
  // ケーキ・デコレーション系
  { id: '1', name: 'ナチュラルグレーデコ缶5号H150', category: 'cake', price: 2800 },
  { id: '2', name: 'エコクラフトデコ缶4号H130', category: 'cake', price: 2600 },
  { id: '3', name: 'UNIエコクラフトカットケーキ1号SS', category: 'cake', price: 1200 },
  { id: '4', name: 'UNIエコクラフトカットケーキ2号S', category: 'cake', price: 1600 },
  { id: '5', name: 'nwカットケーキ1号SS', category: 'cake', price: 1000 },
  { id: '6', name: 'nwカットケーキ2号S', category: 'cake', price: 1400 },
  { id: '7', name: 'エコクラフトデコ缶5号H150', category: 'cake', price: 3000 },
  { id: '8', name: 'Criollo-Bitter-デコ缶4号H130', category: 'cake', price: 2800 },
  
  // パウンドケーキ系
  { id: '9', name: 'パウンドケーキ(チョコレート)', category: 'pound_cake', price: 2200 },
  { id: '10', name: 'パウンドケーキS(ニュートラルグレー)', category: 'pound_cake', price: 2000 },
  { id: '11', name: 'パウンドケーキ(クラフト)', category: 'pound_cake', price: 2100 },
  { id: '12', name: 'パウンドケーキ(ライトプルーフ)', category: 'pound_cake', price: 2300 },
  { id: '13', name: 'パウンドケーキ(ミストグレー)', category: 'pound_cake', price: 2200 },
  { id: '14', name: 'nwパウンドケーキ(ホワイト)', category: 'pound_cake', price: 2400 },
  
  // プロテーン・サプリメント系
  { id: '15', name: 'プロテーン4号サイズ(ホワイト)', category: 'supplement', price: 3200 },
  { id: '16', name: 'プロテーン5号サイズ(ホワイト)', category: 'supplement', price: 3600 },
  { id: '17', name: 'プロテーン6号サイズ(ホワイト)', category: 'supplement', price: 4000 },
  { id: '18', name: 'nwプロテーン5号(ホワイト)', category: 'supplement', price: 3500 },
  
  // ギフトボックス系
  { id: '19', name: 'ギフトボックスM(ナチュラルグレー)', category: 'gift', price: 1800 },
  { id: '20', name: 'ギフトボックスL(ダークグレー)', category: 'gift', price: 2200 },
  { id: '21', name: 'ギフトボックス(ミストグレー)', category: 'gift', price: 2000 },
  { id: '22', name: 'ギフトボックス(ライトプルーフ)', category: 'gift', price: 2100 },
  { id: '23', name: 'nwギフトボックス(ホワイト)', category: 'gift', price: 1900 },
  
  // クラフト・その他
  { id: '24', name: '丸型 クラフト(パウンド・ロール用)No.1', category: 'craft', price: 800 },
  { id: '25', name: '丸型 ホワイト(パウンド・ロール用)No.1', category: 'craft', price: 800 },
  { id: '26', name: 'イーグラップ S クラフト', category: 'craft', price: 600 },
  { id: '27', name: 'イーグラップ M クラフト', category: 'craft', price: 800 },
  { id: '28', name: '保冷剤30g', category: 'other', price: 300 },
  { id: '29', name: '保冷バッグ M', category: 'other', price: 1200 },
  { id: '30', name: '保冷バッグ L', category: 'other', price: 1500 },
]

// カテゴリー定義（実際の商品カテゴリーに合わせて更新）
export const PRODUCT_CATEGORIES = [
  { id: 'cake', name: 'ケーキ・デコ缶', color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
  { id: 'pound_cake', name: 'パウンドケーキ', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  { id: 'supplement', name: 'プロテーン・サプリ', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { id: 'gift', name: 'ギフトボックス', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { id: 'craft', name: 'クラフト・容器', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  { id: 'other', name: 'その他・付属品', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
]

// カテゴリー色の取得
export const getCategoryStyle = (categoryId: string) => {
  const category = PRODUCT_CATEGORIES.find(c => c.id === categoryId)
  return category ? {
    bgColor: category.bgColor,
    textColor: category.textColor,
    name: category.name
  } : {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    name: 'その他'
  }
}

// 売上上位商品の取得（実際のデータがある場合は売上順、ここでは価格順）
export const getTopProducts = (count: number = 10): SampleProduct[] => {
  return SAMPLE_PRODUCTS
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, count)
}

// カテゴリー別商品の取得
export const getProductsByCategory = (categoryId: string): SampleProduct[] => {
  return SAMPLE_PRODUCTS.filter(product => product.category === categoryId)
} 