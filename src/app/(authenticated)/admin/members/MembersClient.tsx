'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { LocalTime } from '@/components/ui/local-time'
import { UserPlus, X, RefreshCw, Trash2 } from 'lucide-react'
import type { MemberRole, PartnerMember } from '@baref00t/sdk/partner'
import {
  inviteMemberAction,
  changeRoleAction,
  removeMemberAction,
  resendInviteAction,
  type ActionResult,
} from './_actions'

const ROLES: MemberRole[] = ['Admin', 'Member', 'Viewer']

interface Props {
  members: PartnerMember[]
  callerRole: MemberRole
  callerEmailHash: string
  /** Surface API errors from the server-side load. */
  loadError: string | null
}

export function MembersClient({ members, callerRole, callerEmailHash, loadError }: Props) {
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const isAdmin = callerRole === 'Admin'

  function run(label: string, fn: () => Promise<ActionResult>) {
    setError(null)
    start(async () => {
      try {
        const r = await fn()
        if (!r.ok) setError(`${label}: ${r.error ?? 'failed'}`)
      } catch (err) {
        setError(`${label}: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  function statusTone(m: PartnerMember): 'success' | 'warning' | 'danger' | 'neutral' {
    if (m.status === 'Active') return 'success'
    if (m.status === 'Pending') return m.hasOpenInvite ? 'warning' : 'danger'
    return 'neutral'
  }

  function statusLabel(m: PartnerMember): string {
    if (m.status === 'Pending') return m.hasOpenInvite ? 'Pending' : 'Invite expired'
    return m.status
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          {isAdmin && (
            <Button onClick={() => setShowInvite(true)} disabled={pending}>
              <UserPlus className="h-4 w-4" /> Invite member
            </Button>
          )}
        </CardHeader>

        {(loadError || error) && (
          <div className="mb-3 rounded-md border border-[color:var(--color-red)] bg-[#ef444411] p-2 text-xs text-[color:var(--color-red)]">
            {loadError ?? error}
          </div>
        )}

        {members.length === 0 ? (
          <p className="rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text-muted)]">
            No members yet. Invite teammates to give them access to this portal.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Invited</TH>
                <TH>Accepted</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {members.map((m) => {
                const isSelf = m.emailHash === callerEmailHash
                const canMutate = isAdmin && !isSelf
                return (
                  <TR key={m.emailHash}>
                    <TD>
                      <span className="font-mono text-xs">{m.email || `…${m.emailHash.slice(-8)}`}</span>
                      {isSelf && (
                        <span className="ml-2 text-xs text-[color:var(--color-text-muted)]">(you)</span>
                      )}
                    </TD>
                    <TD>
                      {canMutate ? (
                        <select
                          value={m.role}
                          disabled={pending}
                          onChange={(e) =>
                            run('Change role', () =>
                              changeRoleAction(m.emailHash, e.target.value as MemberRole),
                            )
                          }
                          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 py-1 text-sm"
                          aria-label={`Role for ${m.email || m.emailHash}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{m.role}</span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(m)}>{statusLabel(m)}</Badge>
                    </TD>
                    <TD className="text-xs text-[color:var(--color-text-muted)]">
                      {m.invitedAt ? <LocalTime iso={m.invitedAt} /> : '—'}
                    </TD>
                    <TD className="text-xs text-[color:var(--color-text-muted)]">
                      {m.acceptedAt ? <LocalTime iso={m.acceptedAt} /> : '—'}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canMutate && m.status === 'Pending' && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run('Resend invite', () => resendInviteAction(m.emailHash))
                            }
                            title="Re-send invite email"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Resend
                          </Button>
                        )}
                        {canMutate && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={pending}
                            onClick={() => {
                              if (
                                confirm(
                                  `Remove ${m.email || 'this member'}? They will lose access immediately.`,
                                )
                              ) {
                                run('Remove member', () => removeMemberAction(m.emailHash))
                              }
                            }}
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}

        <p className="mt-3 text-xs text-[color:var(--color-text-muted)]">
          Roles are enforced platform-side; portal SSO grants access via your Entra tenant gate.
          Invites expire after 7 days — re-send if expired.
        </p>
      </Card>

      {showInvite && (
        <InviteModal
          pending={pending}
          onClose={() => setShowInvite(false)}
          onSubmit={(email, role) => {
            run('Invite member', () => inviteMemberAction(email, role))
            setShowInvite(false)
          }}
        />
      )}
    </div>
  )
}

interface InviteModalProps {
  pending: boolean
  onClose: () => void
  onSubmit: (email: string, role: MemberRole) => void
}

function InviteModal({ pending, onClose, onSubmit }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('Member')

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle id="invite-title">Invite member</CardTitle>
          <Button variant="secondary" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(email, role)
          }}
        >
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-sm text-[color:var(--color-text)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
              Admins can manage members + billing; Members can run assessments; Viewers are read-only.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !email.trim()}>
              {pending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
