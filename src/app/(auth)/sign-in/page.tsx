import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { brandingTokens } from '@/lib/branding'

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl = '/', error } = await searchParams
  const b = brandingTokens()

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="surface w-full max-w-md p-8">
        <div className="mb-6 text-center">
          {b.logoUrl && (
            <img src={b.logoUrl} alt={b.name} className="mx-auto mb-3 h-12 w-auto" />
          )}
          <h1 className="text-xl font-semibold">{b.name}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
            Sign in with your organisation account.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[color:var(--color-red)] bg-[#ff444411] px-3 py-2 text-sm text-[color:var(--color-red)]">
            Sign-in failed. Please try again or contact your administrator.
          </div>
        )}

        <form
          action={async () => {
            'use server'
            await signIn('microsoft-entra-id', { redirectTo: callbackUrl })
          }}
        >
          <Button type="submit" size="lg" className="w-full">
            Sign in with Microsoft
          </Button>
        </form>

        {b.contactEmail && (
          <p className="mt-6 text-center text-xs text-[color:var(--color-text-muted)]">
            Trouble signing in? Contact{' '}
            <a className="underline" href={`mailto:${b.contactEmail}`}>
              {b.contactEmail}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
