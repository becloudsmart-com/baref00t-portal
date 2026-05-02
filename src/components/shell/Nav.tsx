import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { brandingTokens } from '@/lib/branding'
import { LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/customers', label: 'Customers' },
  { href: '/runs', label: 'Assessments' },
  { href: '/admin/configuration', label: 'Settings' },
]

export async function Nav() {
  const b = brandingTokens()
  const session = await auth()

  return (
    <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 font-semibold text-[color:var(--color-text)]">
            {b.logoUrl ? (
              <img src={b.logoUrl} alt={b.name} className="h-8 w-auto" />
            ) : (
              <span className="text-lg">{b.name}</span>
            )}
          </Link>
          <nav className="hidden gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {session?.user && (
            <>
              <span className="text-[color:var(--color-text-muted)]">{session.user.email}</span>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/sign-in' })
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text)]"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
