import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ZustandProvider } from "@/components/providers/ZustandProvider"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { FilterProvider } from "@/contexts/FilterContext"
import { StoreProvider } from "@/contexts/StoreContext"
import ConditionalLayout from "@/components/layout/ConditionalLayout"
import "./globals.css"
import "@shopify/polaris/build/esm/styles.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EC Ranger - Shopifyストア分析ツール",
  description: "EC Ranger - Shopifyストアの売上を最大化する包括的な分析ダッシュボード",
  openGraph: {
    title: "EC Ranger - Shopifyストア分析ツール",
    description: "EC Ranger - Shopifyストアの売上を最大化する包括的な分析ダッシュボード",
    siteName: "EC Ranger",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "EC Ranger",
    description: "Shopifyストアの売上を最大化する分析ツール",
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏪</text></svg>",
        type: "image/svg+xml",
      },
    ],
    shortcut: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏪</text></svg>",
    apple: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏪</text></svg>",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
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
        <AuthProvider>
          <StoreProvider>
            <ZustandProvider>
              <FilterProvider>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
              </FilterProvider>
            </ZustandProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
