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
  title: "Shopify ECマーケティング分析",
  description: "Shopify ECストア向けの包括的なマーケティング分析ダッシュボード",
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
