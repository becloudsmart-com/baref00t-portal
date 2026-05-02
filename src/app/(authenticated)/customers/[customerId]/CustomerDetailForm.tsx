'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import type { PartnerCustomer } from '@baref00t/sdk/partner'
import { updateCustomerAction, type ActionResult } from '../_actions'

export function CustomerDetailForm({ customer }: { customer: PartnerCustomer }) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    updateCustomerAction,
    null,
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="customerId" value={customer.customerId} />
      <div>
        <Label htmlFor="name">Display name</Label>
        <Input id="name" name="name" defaultValue={customer.name} required />
      </div>
      <div>
        <Label htmlFor="email">Primary contact email</Label>
        <Input id="email" name="email" type="email" defaultValue={customer.email} />
      </div>
      <div>
        <Label htmlFor="tenantId">Tenant ID</Label>
        <Input
          id="tenantId"
          name="tenantId"
          defaultValue={customer.tenantId}
          className="font-mono text-xs"
        />
      </div>

      <fieldset className="space-y-2 rounded-md border border-[color:var(--color-border)] p-3">
        <legend className="px-1 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
          Email notifications
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="emailReportsEnabled"
            defaultChecked={customer.emailReportsEnabled}
          />
          Reports
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="emailConsentEnabled"
            defaultChecked={customer.emailConsentEnabled}
          />
          Consent invitations
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="emailQuestionnaireEnabled"
            defaultChecked={customer.emailQuestionnaireEnabled}
          />
          Questionnaire reminders
        </label>
      </fieldset>

      {state?.error && <p className="text-sm text-[color:var(--color-red)]">{state.error}</p>}
      {state?.ok && <p className="text-sm text-[color:var(--color-brand)]">Saved.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
