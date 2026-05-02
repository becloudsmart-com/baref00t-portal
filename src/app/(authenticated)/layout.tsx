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
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-6 py-8">{children}</main>
      <Footer />
    </div>
  )
}
