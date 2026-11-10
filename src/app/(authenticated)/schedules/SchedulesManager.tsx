'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { LocalTime } from '@/components/ui/local-time'
import type { RecurringSchedule, QuotaForecast, CadenceType } from '@baref00t/sdk/partner'
import { productMeta } from '@/lib/products'
import {
  createScheduleAction,
  updateScheduleAction,
  deleteScheduleAction,
  runScheduleNowAction,
} from './_actions'

const CADENCES: CadenceType[] = ['Weekly', 'Monthly', 'Quarterly', 'Custom']
const SELECT_CLASS =
  'w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-sm text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]'

interface Option {
  id: string
  name: string
}
interface ProductOption {
  slug: string
  label: string
}

function cadenceLabel(s: Pick<RecurringSchedule, 'cadenceType' | 'customIntervalDays'>): string {
  return s.cadenceType === 'Custom' ? `Every ${s.customIntervalDays ?? '?'} days` : s.cadenceType
}

function statusTone(status: string | null): { tone: 'success' | 'warning' | 'neutral'; label: string } {
  if (!status) return { tone: 'neutral', label: 'never run' }
  if (status === 'triggered') return { tone: 'success', label: 'triggered' }
  return { tone: 'warning', label: status.replace(/^skipped_/, 'skipped: ').replace(/_/g, ' ') }
}

export function SchedulesManager({
  initialSchedules,
  customers,
  products,
  forecast,
}: {
  initialSchedules: RecurringSchedule[]
  customers: Option[]
  products: ProductOption[]
  forecast: QuotaForecast | null
}) {
  const router = useRouter()
  const [schedules, setSchedules] = useState(initialSchedules)
  const [syncedFrom, setSyncedFrom] = useState(initialSchedules)
  if (initialSchedules !== syncedFrom) {
    setSyncedFrom(initialSchedules)
    setSchedules(initialSchedules)
  }

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [editing, setEditing] = useState<RecurringSchedule | null>(null)
  const [deleting, setDeleting] = useState<RecurringSchedule | null>(null)
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || `${id.slice(0, 8)}…`
  const showToast = (msg: string, tone: 'ok' | 'err') => {
    setToast({ msg, tone })
    setTimeout(() => setToast(null), 4500)
  }

  function toggleEnabled(s: RecurringSchedule) {
    setBusyId(s.id)
    startTransition(async () => {
      const r = await updateScheduleAction(s.id, { enabled: !s.enabled })
      setBusyId(null)
      if (r.ok) {
        setSchedules((xs) => xs.map((x) => (x.id === s.id ? { ...x, enabled: !s.enabled } : x)))
        showToast(s.enabled ? 'Schedule paused' : 'Schedule resumed', 'ok')
        router.refresh()
      } else showToast(r.error ?? 'Update failed', 'err')
    })
  }

  function runNow(s: RecurringSchedule) {
    setBusyId(s.id)
    startTransition(async () => {
      const r = await runScheduleNowAction(s.id)
      setBusyId(null)
      if (r.ok) {
        showToast(r.overQuota ? 'Triggered (over quota — counts toward overage)' : 'Assessment triggered', 'ok')
        router.refresh()
      } else showToast(r.error ?? 'Run failed', 'err')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[color:var(--color-text-muted)]">
          {schedules.length} schedule{schedules.length === 1 ? '' : 's'}
        </div>
        <Button onClick={() => setModal('create')} disabled={customers.length === 0 || products.length === 0}>
          + New schedule
        </Button>
      </div>

      {forecast && <ForecastBanner forecast={forecast} />}

      {schedules.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-[color:var(--color-text-muted)]">
              {customers.length === 0
                ? 'Add a customer first, then schedule recurring assessments.'
                : 'No schedules yet. Create one to run assessments automatically.'}
            </p>
          </div>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH>Product</TH>
              <TH>Cadence</TH>
              <TH>Next run</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {schedules.map((s) => {
              const badge = statusTone(s.lastStatus)
              const rowBusy = busyId === s.id && isPending
              return (
                <TR key={s.id}>
                  <TD>{customerName(s.customerId)}</TD>
                  <TD>{productMeta(s.product).label}</TD>
                  <TD>{cadenceLabel(s)}</TD>
                  <TD className="text-xs text-[color:var(--color-text-muted)]">
                    {s.enabled ? <LocalTime iso={s.nextRunAt} /> : 'paused'}
                  </TD>
                  <TD>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="secondary" size="sm" disabled={rowBusy} onClick={() => runNow(s)}>
                        Run now
                      </Button>
                      <Button variant="secondary" size="sm" disabled={rowBusy} onClick={() => toggleEnabled(s)}>
                        {s.enabled ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditing(s)
                          setModal('edit')
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDeleting(s)
                          setModal('delete')
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <ScheduleModal
          mode={modal}
          customers={customers}
          products={products}
          existing={modal === 'edit' ? editing : null}
          onCancel={() => {
            setModal(null)
            setEditing(null)
          }}
          onDone={(msg) => {
            setModal(null)
            setEditing(null)
            showToast(msg, 'ok')
            router.refresh()
          }}
          onError={(msg) => showToast(msg, 'err')}
        />
      )}

      {modal === 'delete' && deleting && (
        <Modal onClose={() => { setModal(null); setDeleting(null) }} title="Delete schedule">
          <p className="text-sm">
            Stop recurring <strong>{productMeta(deleting.product).label}</strong> assessments for{' '}
            <strong>{customerName(deleting.customerId)}</strong>?
          </p>
          <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
            Past runs are kept. Use Pause to stop temporarily.
          </p>
          <div className="mt-5 flex gap-3">
            <Button
              variant="danger"
              disabled={isPending}
              onClick={() => {
                const id = deleting.id
                startTransition(async () => {
                  const r = await deleteScheduleAction(id)
                  if (r.ok) {
                    setSchedules((xs) => xs.filter((x) => x.id !== id))
                    setModal(null)
                    setDeleting(null)
                    showToast('Schedule deleted', 'ok')
                    router.refresh()
                  } else showToast(r.error ?? 'Delete failed', 'err')
                })
              }}
            >
              Delete
            </Button>
            <Button variant="secondary" onClick={() => { setModal(null); setDeleting(null) }}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          className={
            'fixed bottom-6 right-6 z-[60] rounded-md px-4 py-3 text-sm shadow-lg ' +
            (toast.tone === 'ok'
              ? 'bg-[color:var(--color-brand-muted)] text-[color:var(--color-brand)]'
              : 'bg-[#ff444422] text-[color:var(--color-red)]')
          }
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function ForecastBanner({ forecast }: { forecast: QuotaForecast }) {
  const over = forecast.overBy > 0
  return (
    <Card className={over ? 'border-[color:var(--color-amber)]' : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-[color:var(--color-text-muted)]">Forecast ({forecast.billingMonth}):</span>{' '}
          <strong>{forecast.used}</strong> used · <strong>{forecast.projected}</strong> projected ={' '}
          <strong>{forecast.total}</strong>
          {forecast.unlimited ? (
            <span className="text-[color:var(--color-text-muted)]"> / unlimited</span>
          ) : (
            <>
              {' / '}
              <strong>{forecast.quota}</strong> quota
            </>
          )}
        </p>
        {over && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[color:var(--color-amber)]">
              Projected {forecast.overBy} over quota — scheduled runs still execute.
            </span>
            <Link href="/admin/billing">
              <Button size="sm">Upgrade plan</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[480px] rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

function ScheduleModal({
  mode,
  customers,
  products,
  existing,
  onCancel,
  onDone,
  onError,
}: {
  mode: 'create' | 'edit'
  customers: Option[]
  products: ProductOption[]
  existing: RecurringSchedule | null
  onCancel: () => void
  onDone: (msg: string) => void
  onError: (msg: string) => void
}) {
  const isCreate = mode === 'create'
  const [customerId, setCustomerId] = useState(existing?.customerId ?? '')
  const [product, setProduct] = useState(existing?.product ?? '')
  const [cadenceType, setCadenceType] = useState<CadenceType>(existing?.cadenceType ?? 'Monthly')
  const [intervalDays, setIntervalDays] = useState(
    existing?.customIntervalDays != null ? String(existing.customIntervalDays) : '30',
  )
  const [maturityTarget, setMaturityTarget] = useState(existing?.maturityTarget ?? '')
  const [enabled, setEnabled] = useState(existing?.enabled ?? true)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (isCreate && !customerId) return onError('Select a customer')
    if (isCreate && !product) return onError('Select a product')
    let customIntervalDays: number | null = null
    if (cadenceType === 'Custom') {
      const n = parseInt(intervalDays, 10)
      if (!Number.isInteger(n) || n < 1 || n > 365) return onError('Custom interval must be 1–365 days')
      customIntervalDays = n
    }
    const maturity = maturityTarget.trim() || null

    startTransition(async () => {
      const r = isCreate
        ? await createScheduleAction(customerId, { product, cadenceType, customIntervalDays, maturityTarget: maturity })
        : await updateScheduleAction(existing!.id, { cadenceType, customIntervalDays, maturityTarget: maturity, enabled })
      if (r.ok) onDone(isCreate ? 'Schedule created' : 'Schedule updated')
      else onError(r.error ?? 'Save failed')
    })
  }

  return (
    <Modal title={isCreate ? 'New schedule' : 'Edit schedule'} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="sm-customer">Customer *</Label>
          {isCreate ? (
            <select
              id="sm-customer"
              className={SELECT_CLASS}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm">{customers.find((c) => c.id === customerId)?.name || customerId}</p>
          )}
        </div>

        <div>
          <Label htmlFor="sm-product">Product *</Label>
          {isCreate ? (
            <select
              id="sm-product"
              className={SELECT_CLASS}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm">{productMeta(product).label}</p>
          )}
        </div>

        <div>
          <Label htmlFor="sm-cadence">Cadence *</Label>
          <select
            id="sm-cadence"
            className={SELECT_CLASS}
            value={cadenceType}
            onChange={(e) => setCadenceType(e.target.value as CadenceType)}
          >
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {cadenceType === 'Custom' && (
          <div>
            <Label htmlFor="sm-interval">Interval (days, 1–365) *</Label>
            <Input
              id="sm-interval"
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="sm-maturity">Maturity target (optional)</Label>
          <Input
            id="sm-maturity"
            value={maturityTarget}
            onChange={(e) => setMaturityTarget(e.target.value)}
            placeholder="e.g. ml1"
          />
        </div>

        {!isCreate && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--color-brand)]"
            />
            <span>Enabled (uncheck to pause)</span>
          </label>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button disabled={isPending} onClick={submit}>
          {isPending ? 'Saving…' : isCreate ? 'Create' : 'Save'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}
