'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { rerunAssessmentAction, type RerunResult } from './_actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? 'Re-running…' : 'Confirm re-run (uses 1 credit)'}
    </Button>
  )
}

export function RerunButton({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<RerunResult | null, FormData>(rerunAssessmentAction, null)

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Re-run assessment
      </Button>
    )
  }

  return (
    <div className="rounded-md border border-[color:var(--color-amber)] bg-[color:var(--color-bg-elev)] p-3 text-sm">
      <p className="mb-3">
        <strong>Heads up:</strong> re-running this assessment consumes <strong>one</strong> run credit
        from your monthly plan. The customer will receive a fresh report once it completes.
      </p>
      {state?.error && (
        <p className="mb-3 text-[color:var(--color-red)]">
          {state.error}
          {state.consentUrl && (
            <>
              {' '}
              <a className="underline" href={state.consentUrl} target="_blank" rel="noreferrer">
                Open consent URL
              </a>
            </>
          )}
        </p>
      )}
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="runId" value={runId} />
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </form>
    </div>
  )
}
