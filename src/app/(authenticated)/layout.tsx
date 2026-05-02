import { auth } from '@/auth'
import { Nav } from '@/components/shell/Nav'
import { Footer } from '@/components/shell/Footer'
import { redirect } from 'next/navigation'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/sign-in')

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      {/* Full-bleed content — same px-6 horizontal padding as the top
          nav so left/right edges align. No max-width constraint on
          large monitors. */}
      <main className="w-full flex-1 px-6 py-8">{children}</main>
      <Footer />
    </div>
  )
}
