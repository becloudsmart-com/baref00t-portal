import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError } from '@baref00t/sdk'
import type { ListMembersResponse } from '@baref00t/sdk/partner'
import { MembersClient } from './MembersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members' }

export default async function MembersPage() {
  const log = logger()
  let data: ListMembersResponse | null = null
  let error: string | null = null

  try {
    data = await partnerClient().members.list()
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 404) {
      // Pre-v2.1.10 platforms return 404 because the route alias for
      // X-Partner-Key auth doesn't exist yet. Fall back to an empty list
      // with a clear inline note rather than 500-ing the page.
      error =
        'Member management requires baref00t platform v2.1.10 or later. Upgrade the backend or contact support.'
    } else {
      error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
      log.warn({ err }, 'members.list failed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Invite teammates to this portal. Roles control which actions each member can take.
        </p>
      </div>

      <MembersClient
        members={data?.members ?? []}
        callerRole={data?.callerRole ?? 'Member'}
        callerEmailHash={data?.callerEmailHash ?? ''}
        loadError={error}
      />
    </div>
  )
}
