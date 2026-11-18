import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { brandingTokens } from '@/lib/branding'

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>
}

const KNOWN_ERRORS: Record<string, string> = {
  Configuration: 'Authentication is misconfigured. Contact your administrator.',
  AccessDenied: 'Your account is not allowed to sign in to this portal.',
  Verification: 'The sign-in link is invalid or has expired.',
  OAuthCallback: 'Something went wrong with the Microsoft sign-in flow. Try again.',
  OAuthSignin: 'Could not start the Microsoft sign-in flow. Try again.',
  default: 'An unexpected error occurred during sign-in.',
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { error = 'default' } = await searchParams
  const b = brandingTokens()
  const message = KNOWN_ERRORS[error] ?? KNOWN_ERRORS.default

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">{b.name}</h1>
        <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">{message}</p>
        <p className="mt-1 font-mono text-xs text-[color:var(--color-text-muted)]">code: {error}</p>
        <div className="mt-6">
          <Link href="/sign-in">
            <Button variant="secondary">Back to sign-in</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
