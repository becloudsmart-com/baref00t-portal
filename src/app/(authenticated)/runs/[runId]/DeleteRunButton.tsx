'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { deleteAssessmentAction, type DeleteResult } from './_actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? 'Deleting…' : 'Delete permanently'}
    </Button>
  )
}

/**
 * Hard-delete an assessment + its report (#542). Two-step confirm so it can't
 * be triggered by a stray click. `assessmentId` == runId in the v1 API.
 */
export function DeleteRunButton({ assessmentId }: { assessmentId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<DeleteResult | null, FormData>(deleteAssessmentAction, null)

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Delete assessment
      </Button>
    )
  }

  return (
    <div className="rounded-md border border-[color:var(--color-red)] bg-[color:var(--color-bg-elev)] p-3 text-sm">
      <p className="mb-3">
        <strong>This permanently deletes</strong> the assessment, its run record, and the rendered
        report. The customer&apos;s report link will stop working. This <strong>cannot be undone</strong>.
      </p>
      {state?.error && (
        <p className="mb-3 text-[color:var(--color-red)]">{state.error}</p>
      )}
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </form>
    </div>
  )
}
