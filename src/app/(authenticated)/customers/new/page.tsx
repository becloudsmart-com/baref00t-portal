'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { createCustomerAction, type ActionResult } from '../_actions'
import { useEffect } from 'react'

export default function NewCustomerPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    createCustomerAction,
    null,
  )

  useEffect(() => {
    if (state?.ok && state.customerId) {
      router.push(`/customers/${state.customerId}`)
    }
  }, [state, router])

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New customer</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Register a new tenant under your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Display name *</Label>
            <Input id="name" name="name" required maxLength={120} placeholder="Acme Corp" />
          </div>
          <div>
            <Label htmlFor="tenantId">Microsoft Entra tenant ID *</Label>
            <Input id="tenantId" name="tenantId" required placeholder="00000000-0000-0000-0000-000000000000" />
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
              The customer&apos;s Azure AD / Entra tenant GUID. Required for assessments.
            </p>
          </div>
          <div>
            <Label htmlFor="email">Primary contact email</Label>
            <Input id="email" name="email" type="email" placeholder="security@acme.com" />
          </div>

          <fieldset className="space-y-2 rounded-md border border-[color:var(--color-border)] p-3">
            <legend className="px-1 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
              Email notifications
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="emailReportsEnabled" />
              Send report-ready emails to this customer
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="emailConsentEnabled" defaultChecked />
              Send consent invitations
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="emailQuestionnaireEnabled" defaultChecked />
              Send questionnaire reminders
            </label>
          </fieldset>

          {state?.error && (
            <p className="text-sm text-[color:var(--color-red)]">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Link href="/customers">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create customer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
