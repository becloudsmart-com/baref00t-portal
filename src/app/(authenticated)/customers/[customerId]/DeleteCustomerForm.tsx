'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteCustomerAction } from '../_actions'

export function DeleteCustomerForm({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [pending, start] = useTransition()
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const matched = confirmText === customerName

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!matched) return
        setError(null)
        start(async () => {
          try {
            await deleteCustomerAction(customerId)
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          }
        })
      }}
      className="space-y-3"
    >
      <p className="text-xs text-[color:var(--color-text-muted)]">
        Type <span className="font-mono text-[color:var(--color-text)]">{customerName}</span> to
        confirm.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-sm font-mono"
        placeholder={customerName}
      />
      {error && <p className="text-xs text-[color:var(--color-red)]">{error}</p>}
      <Button type="submit" variant="danger" disabled={!matched || pending} className="w-full">
        {pending ? 'Deleting…' : 'Delete customer'}
      </Button>
    </form>
  )
}
