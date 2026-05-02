import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { brandingTokens } from '@/lib/branding'
import { getCurrentUserProfile } from '@/lib/graph'
import { UserMenu } from './UserMenu'

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/customers', label: 'Customers' },
  { href: '/runs', label: 'Assessments' },
  { href: '/admin/configuration', label: 'Settings' },
]

export async function Nav() {
  const b = brandingTokens()
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
        </div>
      </div>
    </header>
  )
}
