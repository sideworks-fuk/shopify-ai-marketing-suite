import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { Inter } from "next/font/google"
import { ZustandProvider } from "@/components/providers/ZustandProvider"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { FilterProvider } from "@/contexts/FilterContext"
import { StoreProvider } from "@/contexts/StoreContext"
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"
import ConditionalLayout from "@/components/layout/ConditionalLayout"
import "./globals.css"
import "@shopify/polaris/build/esm/styles.css"
import { AuthGuard } from "@/components/auth/AuthGuard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EC Ranger - Shopifyストア分析ツール",
  description: "EC Ranger - Shopifyストアの売上を最大化する包括的な分析ダッシュボード",
  openGraph: {
    title: "EC Ranger - Shopifyストア分析ツール",
    description: "EC Ranger - Shopifyストアの売上を最大化する包括的な分析ダッシュボード",
    siteName: "EC Ranger",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "EC Ranger - Shopifyストア分析ツール",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EC Ranger",
    description: "Shopifyストアの売上を最大化する分析ツール",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* useSearchParams() を使用する Client Component ツリーは Suspense 配下に置く（missing-suspense-with-csr-bailout対策） */}
        <Suspense fallback={null}>
          <AuthProvider>
            <StoreProvider>
              <AuthGuard>
                <SubscriptionProvider>
                  <ZustandProvider>
                    <FilterProvider>
                      <ConditionalLayout>
                        {children}
                      </ConditionalLayout>
                    </FilterProvider>
                  </ZustandProvider>
                </SubscriptionProvider>
              </AuthGuard>
            </StoreProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
