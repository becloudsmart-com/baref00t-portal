'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_NAV = [
  { href: '/admin/configuration', label: 'Configuration' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/api-keys', label: 'API keys' },
  { href: '/admin/usage', label: 'Usage' },
  { href: '/admin/billing', label: 'Billing' },
  { href: '/admin/branding', label: 'Branding' },
  { href: '/admin/webhooks', label: 'Webhooks' },
  { href: '/admin/mail', label: 'Email configuration' },
]

/**
 * Horizontal tab bar for the Settings sub-pages. Replaces the previous
 * left sidebar so each page can use the full content width.
 *
 * Uses `aria-current="page"` for the active tab styling and a sticky
 * border-bottom for the inactive baseline.
 */
export function AdminTabs() {
  const pathname = usePathname() ?? ''

  return (
    <div className="overflow-x-auto border-b border-[color:var(--color-border)]">
      <nav className="-mb-px flex min-w-max gap-1" role="tablist" aria-label="Settings">
        {ADMIN_NAV.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-current={isActive ? 'page' : undefined}
              className={
                isActive
                  ? 'border-b-2 border-[color:var(--color-brand)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]'
                  : 'border-b-2 border-transparent px-4 py-2 text-sm text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-strong,_#3f3f46)] hover:text-[color:var(--color-text)]'
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
