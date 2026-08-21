import Link from 'next/link'

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
 * Admin shell — left sidebar nav. Pages render in the right column with
 * the full remaining width (no inner max-width constraint).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      <nav className="space-y-1 text-sm">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
          Settings
        </h2>
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-1.5 text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-panel,_var(--color-bg-elev))] hover:text-[color:var(--color-text)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
