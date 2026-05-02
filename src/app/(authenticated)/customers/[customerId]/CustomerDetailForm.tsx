'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { MultiEmailInput } from '@/components/ui/multi-email-input'
import type { PartnerCustomer, Receiver } from '@baref00t/sdk/partner'
import { updateCustomerAction, type ActionResult } from '../_actions'

/** Receiver entries are wire-flexible: bare email string OR `{email, role}` object.
 *  Normalize to a plain string list for the chip input. */
function toEmailList(receivers: Receiver[] | undefined): string[] {
  if (!receivers) return []
  return receivers
    .map((r) => (typeof r === 'string' ? r : r.email))
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
}

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

      <fieldset className="space-y-4 rounded-md border border-[color:var(--color-border)] p-3">
        <legend className="px-1 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
          Recipients
        </legend>
        <div>
          <Label htmlFor="consentRecipients">Consent invitation recipients</Label>
          <MultiEmailInput
            id="consentRecipients"
            name="consentRecipients"
            defaultValue={toEmailList(customer.consentRecipients)}
          />
        </div>
        <div>
          <Label htmlFor="questionnaireRecipients">Questionnaire recipients</Label>
          <MultiEmailInput
            id="questionnaireRecipients"
            name="questionnaireRecipients"
            defaultValue={toEmailList(customer.questionnaireRecipients)}
          />
        </div>
        <div>
          <Label htmlFor="receivers">Report recipients</Label>
          <MultiEmailInput
            id="receivers"
            name="receivers"
            defaultValue={toEmailList(customer.receivers)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-md border border-[color:var(--color-border)] p-3">
        <legend className="px-1 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
          Email channels
        </legend>
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="emailReportsEnabled"
            defaultChecked={customer.emailReportsEnabled}
          />
          Report-ready emails
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
