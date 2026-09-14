/**
 * Next.js boot hook — runs once on the server before the first request.
 *
 * We use it to fail-fast if env validation rejects: the container exits
 * with a clear error instead of starting up half-configured.
 */

export async function register() {
  // Only run on the Node.js runtime (not edge), and only on server boot.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { env } = await import('./env')
  // Throws synchronously on any validation failure — Next.js will surface
  // the message in the container's stdout and exit with code 1.
  env()
}
