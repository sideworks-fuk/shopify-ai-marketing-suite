// 統一商品リスト（全画面で使用）
export interface SampleProduct {
  id: string
  name: string
  category: string
  description?: string
  price?: number
}

// 統一商品データ
export const SAMPLE_PRODUCTS: SampleProduct[] = [
  { id: '1', name: '【サプリ】カフェトレーヌ180 ホワイト', category: 'supplement', price: 2800 },
  { id: '2', name: '【サプリ】カフェトレーヌ165 ブラウン', category: 'supplement', price: 2600 },
  { id: '3', name: '【サプリ】光トレースリム150黒', category: 'supplement', price: 2400 },
  { id: '4', name: '【サプリ】rwクリスマスデコ箱付けH100', category: 'supplement', price: 3200 },
  { id: '5', name: '【サプリ】Oriole-Bitter デコ箱付けH100', category: 'supplement', price: 3000 },
  { id: '6', name: '【食品】（幸せ商品）', category: 'food', price: 1800 },
  { id: '7', name: '商品G', category: 'other', price: 1500 },
  { id: '8', name: '商品H', category: 'other', price: 1200 },
  { id: '9', name: '商品I（個）', category: 'other', price: 800 },
  { id: '10', name: '商品J（スプーン）', category: 'other', price: 600 },
  { id: '11', name: '商品K（メンチ用品）', category: 'other', price: 900 },
  { id: '12', name: '商品L（保冷剤）', category: 'other', price: 400 },
  { id: '13', name: '【ギフト】クリスマスセットA', category: 'gift', price: 4500 },
  { id: '14', name: '【ギフト】バレンタインセットB', category: 'gift', price: 3800 },
  { id: '15', name: '【食品】プロテインパウダー', category: 'food', price: 5200 },
  { id: '16', name: '【食品】ビタミンC錠剤', category: 'food', price: 1600 },
  { id: '17', name: '【食品】青汁粉末', category: 'food', price: 2200 },
  { id: '18', name: '【食品】コラーゲンドリンク', category: 'food', price: 3600 },
  { id: '19', name: '【食品】マルチビタミン', category: 'food', price: 2800 },
  { id: '20', name: '【その他】アクセサリー小物', category: 'other', price: 1200 },
]

// カテゴリー定義
export const PRODUCT_CATEGORIES = [
  { id: 'supplement', name: '【サプリ】', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { id: 'food', name: '【食品】', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  { id: 'gift', name: '【ギフト】', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { id: 'other', name: 'その他', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
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

// 売上上位商品の取得（実際のデータがある場合は売上順、ここではランダム）
export const getTopProducts = (count: number = 10): SampleProduct[] => {
  return SAMPLE_PRODUCTS
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, count)
}

// カテゴリー別商品の取得
export const getProductsByCategory = (categoryId: string): SampleProduct[] => {
  return SAMPLE_PRODUCTS.filter(product => product.category === categoryId)
} 