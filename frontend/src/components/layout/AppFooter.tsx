"use client"

import Link from "next/link"
import { FileText, Shield } from "lucide-react"

export function AppFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>© 2025 EC Ranger. All rights reserved.</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://www.access-net.co.jp/shopify/terms.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>利用規約</span>
            </a>
            
            <a
              href="https://www.access-net.co.jp/shopify/data-processing-agreement.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>データ処理契約</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

