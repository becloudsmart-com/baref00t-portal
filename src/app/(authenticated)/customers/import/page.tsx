'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea, Label } from '@/components/ui/input'
import { bulkImportCustomersAction } from '../_actions'

const SAMPLE = `name,tenantId,email
Acme Corp,00000000-0000-0000-0000-000000000001,security@acme.com
Globex,00000000-0000-0000-0000-000000000002,it@globex.com`

export default function BulkImportPage() {
  const [state, formAction, isPending] = useActionState(bulkImportCustomersAction, null)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          <Link href="/customers" className="hover:underline">
            ← Customers
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Bulk import customers</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Paste up to 100 rows of CSV. Header row required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV body</CardTitle>
        </CardHeader>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="csv">CSV (header: name,tenantId,email)</Label>
            <Textarea
              id="csv"
              name="csv"
              required
              rows={12}
              className="font-mono text-xs"
              defaultValue={SAMPLE}
            />
          </div>

          {state && (
            <div
              className={`rounded-md border p-3 text-sm ${
                state.ok
                  ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-muted)]'
                  : 'border-[color:var(--color-red)] bg-[#ff444411] text-[color:var(--color-red)]'
              }`}
            >
              {state.ok ? (
                <p>
                  Imported {state.succeeded} of {state.total}{' '}
                  {state.failed ? <span className="text-[color:var(--color-red)]">({state.failed} failed)</span> : null}
                </p>
              ) : (
                <p>{state.error ?? 'Import failed'}</p>
              )}
              {state.errors && state.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {state.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {state.errors.length > 10 && <li>… and {state.errors.length - 10} more</li>}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Link href="/customers">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
