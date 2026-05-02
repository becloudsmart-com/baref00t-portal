import { handlers } from '@/auth'

// Force Node runtime — NextAuth v5 needs node:crypto for JWE.
export const runtime = 'nodejs'

export const { GET, POST } = handlers
