import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ZustandProvider } from "@/components/providers/ZustandProvider"
import { FilterProvider } from "@/contexts/FilterContext"
import MainLayout from "@/components/layout/MainLayout"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Shopify ECマーケティング分析",
  description: "Shopify ECストア向けの包括的なマーケティング分析ダッシュボード",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ZustandProvider>
          <FilterProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </FilterProvider>
        </ZustandProvider>
      </body>
    </html>
  )
}
