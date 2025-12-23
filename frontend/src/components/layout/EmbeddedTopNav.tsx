'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { menuStructure } from '@/lib/menuConfig'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

function buildHrefWithCurrentQuery(href: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString()
  if (!qs) return href
  return href.includes('?') ? `${href}&${qs}` : `${href}?${qs}`
}

export function EmbeddedTopNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const items = menuStructure.filter((m) => m.isImplemented && m.href)

  // 10メニュー程度の将来拡張を想定し、上部は「主要ショートカット + ドロップダウン」にする
  const primaryIds = new Set(['data-sync', 'year-over-year', 'purchase-count', 'dormant-customers'])
  const primaryItems = items.filter((i) => primaryIds.has(i.id)).slice(0, 4)
  const secondaryItems = items.filter((i) => !primaryIds.has(i.id))

  const categories = [
    { key: 'settings', label: '設定' },
    { key: 'sales', label: '商品分析' },
    { key: 'purchase', label: '購買分析' },
    { key: 'customers', label: '顧客分析' },
    { key: 'ai-insights', label: 'AIインサイト' },
  ] as const

  const byCategory = (category: (typeof categories)[number]['key']) =>
    secondaryItems.filter((i) => i.category === category)

  const hasSecondaryItems = secondaryItems.length > 0

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 py-2">
        <nav className="flex flex-wrap items-center gap-2">
          {primaryItems.map((item) => {
            const href = item.href as string
            const active = pathname === href
            const finalHref = buildHrefWithCurrentQuery(href, searchParams)

            return (
              <Link
                key={item.id}
                href={finalHref}
                className={[
                  'text-sm px-3 py-1.5 rounded-md border transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}

          {hasSecondaryItems && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  メニュー
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {categories.map((cat, idx) => {
                  const catItems = byCategory(cat.key)
                  if (catItems.length === 0) return null

                  return (
                    <div key={cat.key}>
                      <DropdownMenuLabel>{cat.label}</DropdownMenuLabel>
                      {catItems.map((item) => {
                        const href = item.href as string
                        const finalHref = buildHrefWithCurrentQuery(href, searchParams)
                        const active = pathname === href
                        return (
                          <DropdownMenuItem key={item.id} asChild>
                            <Link href={finalHref} className={active ? 'text-blue-700' : ''}>
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                      {idx < categories.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </div>
  )
}


