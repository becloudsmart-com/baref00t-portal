import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { getBrandingTokens } from '@/lib/branding'
import { getCurrentUserProfile } from '@/lib/graph'
import { UserMenu } from './UserMenu'
import { ThemeToggle } from './ThemeToggle'
import { BrandMark } from './BrandMark'

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/customers', label: 'Customers' },
  { href: '/runs', label: 'Assessments' },
  { href: '/admin/configuration', label: 'Settings' },
]

export async function Nav() {
  // Platform-first branding (#325 F27) — falls back to env on API error.
  const b = await getBrandingTokens()
  const session = await auth()
  const user = session?.user

  // Start with OIDC claims as the source of truth (always available, no
  // network call). Then enrich with Graph /me when an access token is
  // present in the session — adds displayName, jobTitle, department.
  // Photo is loaded in the browser by UserMenu via /api/me/photo so the
  // server-rendered nav doesn't block on the Graph round-trip.
  let name = user?.name?.trim() || ''
  const email = user?.email?.trim() || ''
  let jobTitle: string | null = null
  let department: string | null = null
  let hasGraphToken = false

  if (session?.msAccessToken) {
    hasGraphToken = true
    const profile = await getCurrentUserProfile(session.msAccessToken)
    if (profile) {
      if (profile.displayName) name = profile.displayName
      jobTitle = profile.jobTitle
      department = profile.department
    }
  }

  return (
    <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-panel-2,#1a1a1a)]">
      <div className="flex items-center gap-6 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3 font-semibold text-[color:var(--color-text)]">
          <BrandMark name={b.name} logoUrl={b.logoUrl} />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
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
        <div className="flex items-center gap-2 text-sm">
          {user && (
            <UserMenu
              name={name}
              email={email}
              jobTitle={jobTitle}
              department={department}
              photoUrl={hasGraphToken ? '/api/me/photo' : null}
              signOutAction={async () => {
                'use server'
                await signOut({ redirectTo: '/sign-in' })
              }}
            />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
