import { type NextRequest, NextResponse } from "next/server"
import { ShopifyAPI } from "@/lib/shopify"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopDomain = searchParams.get("shop")
    const accessToken = searchParams.get("access_token")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: "Shop domain and access token are required" }, { status: 400 })
    }

    const shopify = new ShopifyAPI({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecret: process.env.SHOPIFY_API_SECRET!,
      scopes: process.env.SHOPIFY_SCOPES!,
      shopDomain,
      accessToken,
    })

    const data = await shopify.getCustomers(limit)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Shopify Customers API Error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
