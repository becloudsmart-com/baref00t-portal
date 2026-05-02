'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import {
  previewBrandingAction,
  sendBrandingPreviewAction,
  saveBrandingAction,
  type BrandingDraft,
} from './_actions'

type Tab = 'email-consent' | 'email-report' | 'report'

const TABS: { id: Tab; label: string }[] = [
  { id: 'email-consent', label: 'Consent email' },
  { id: 'email-report', label: 'Report email' },
  { id: 'report', label: 'Report viewer' },
]

interface Props {
  initial: BrandingDraft
}

/**
 * Live branding editor. Draft values are debounced (500 ms) and POSTed to
 * the platform's preview endpoints; the returned HTML is rendered inside a
 * sandboxed iframe so styles can't leak in either direction.
 *
 * Form values are also wired through hidden inputs (no on*= attributes in
 * server-rendered HTML — see CSP-Safe Handler Pattern in CLAUDE.md). All
 * mutation is in-memory only; persistence still flows through env vars
 * and a portal restart, matching the v0.1.4 deployment story.
 */
export function BrandingPreviewClient({ initial }: Props) {
  const [draft, setDraft] = useState<BrandingDraft>(initial)
  const [activeTab, setActiveTab] = useState<Tab>('email-consent')
  const [previews, setPreviews] = useState<Partial<Record<Tab, string>>>({})
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({})
  const [pending, start] = useTransition()
  const [sendStatus, setSendStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [sending, startSend] = useTransition()
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, startSave] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchedFor = useRef<Partial<Record<Tab, string>>>({})

  // Stringify the draft once per render — used as the cache key for "did this
  // tab already fetch the current draft?" so we don't re-call on every keystroke.
  const draftKey = useMemo(() => JSON.stringify(draft), [draft])

  // Debounced fetch when draft or active tab changes.
  useEffect(() => {
    if (fetchedFor.current[activeTab] === draftKey) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      start(async () => {
        const result = await previewBrandingAction(activeTab, draft)
        if (result.ok && result.html !== undefined) {
          setPreviews((prev) => ({ ...prev, [activeTab]: result.html }))
          setErrors((prev) => ({ ...prev, [activeTab]: undefined }))
          fetchedFor.current[activeTab] = draftKey
        } else {
          setErrors((prev) => ({ ...prev, [activeTab]: result.error ?? 'Unknown error' }))
        }
      })
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draftKey, activeTab, draft])

  function update<K extends keyof BrandingDraft>(key: K, value: BrandingDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSend() {
    setSendStatus(null)
    startSend(async () => {
      try {
        const result = await sendBrandingPreviewAction(activeTab, draft)
        setSendStatus({
          ok: result.ok,
          message: result.ok ? (result.message ?? 'Sent.') : (result.error ?? 'Send failed.'),
        })
      } catch (err) {
        setSendStatus({ ok: false, message: err instanceof Error ? err.message : String(err) })
      }
    })
  }

  function handleSave() {
    setSaveStatus(null)
    startSave(async () => {
      try {
        const result = await saveBrandingAction(draft)
        setSaveStatus({
          ok: result.ok,
          message: result.ok
            ? `Saved ${result.fields ?? 0} field${result.fields === 1 ? '' : 's'} to the platform.`
            : (result.error ?? 'Save failed.'),
        })
      } catch (err) {
        setSaveStatus({ ok: false, message: err instanceof Error ? err.message : String(err) })
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Draft branding</CardTitle>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save to platform'}
          </Button>
        </CardHeader>
        <p className="mb-4 text-xs text-[color:var(--color-text-muted)]">
          <strong>Save</strong> persists brand color, footer, contact email, and company name on
          the platform — these drive your customers&apos; consent emails, report emails, and the
          report viewer chrome. Portal-internal chrome (nav, favicon, theme) is env-driven and
          requires a container restart to change.
        </p>
        {saveStatus && (
          <div
            className={`mb-3 rounded border p-2 text-xs ${
              saveStatus.ok
                ? 'border-[color:var(--color-green,#15803d)] bg-[#15803d11]'
                : 'border-[color:var(--color-red)] bg-[#ff444411] text-[color:var(--color-red)]'
            }`}
          >
            {saveStatus.message}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label htmlFor="b-name">Brand name</Label>
            <Input
              id="b-name"
              value={draft.name ?? ''}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="b-primary">Primary color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="b-primary"
                type="text"
                value={draft.primaryColor ?? ''}
                onChange={(e) => update('primaryColor', e.target.value)}
                placeholder="#00cc66"
                className="font-mono"
              />
              <input
                type="color"
                aria-label="Pick primary color"
                value={draft.primaryColor ?? '#00cc66'}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-[color:var(--color-border)]"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="b-logo">Logo URL</Label>
            <Input
              id="b-logo"
              value={draft.logoUrl ?? ''}
              onChange={(e) => update('logoUrl', e.target.value)}
              placeholder="https://cdn.example.com/logo.svg"
            />
          </div>
          <div>
            <Label htmlFor="b-contact">Contact email</Label>
            <Input
              id="b-contact"
              type="email"
              value={draft.contactEmail ?? ''}
              onChange={(e) => update('contactEmail', e.target.value)}
              placeholder="support@example.com"
            />
          </div>
          <div>
            <Label htmlFor="b-footer">Footer text</Label>
            <Input
              id="b-footer"
              value={draft.footerText ?? ''}
              onChange={(e) => update('footerText', e.target.value)}
              placeholder="© 2026 Example Co."
            />
          </div>
          <div>
            <Label htmlFor="b-theme">Theme</Label>
            <select
              id="b-theme"
              value={draft.theme ?? 'dark'}
              onChange={(e) => update('theme', e.target.value as 'dark' | 'light')}
              className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-sm text-[color:var(--color-text)]"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          {pending && (
            <span className="text-xs text-[color:var(--color-text-muted)]">refreshing…</span>
          )}
        </CardHeader>

        <div
          className="mb-3 inline-flex rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-0.5 text-sm"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded px-3 py-1 ${
                activeTab === t.id
                  ? 'bg-[color:var(--color-brand)] text-black'
                  : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {errors[activeTab] && (
          <p className="mb-2 text-xs text-[color:var(--color-red)]">{errors[activeTab]}</p>
        )}

        <div className="overflow-hidden rounded-md border border-[color:var(--color-border)] bg-white">
          {previews[activeTab] !== undefined ? (
            <iframe
              key={activeTab}
              title={`${activeTab} preview`}
              srcDoc={previews[activeTab]}
              sandbox="allow-same-origin"
              className="h-[600px] w-full"
            />
          ) : (
            <div className="flex h-[600px] items-center justify-center text-sm text-[color:var(--color-text-muted)]">
              {pending ? 'Loading preview…' : 'Adjust branding fields to see a preview.'}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={sending || !previews[activeTab]}
            onClick={handleSend}
            title="Send the rendered preview to the signed-in user's mailbox"
          >
            <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send to me'}
          </Button>
          {sendStatus && (
            <span
              role="status"
              aria-live="polite"
              className={`text-xs ${sendStatus.ok ? 'text-[color:var(--color-brand)]' : 'text-[color:var(--color-red)]'}`}
            >
              {sendStatus.message}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--color-text-muted)]">
          Sends through this portal&apos;s own Microsoft Graph (MAIL_FROM_ADDRESS env). The
          report-viewer preview is HTML — most email clients won&apos;t render every interactive
          element identically to the live page.
        </p>
      </Card>
    </div>
  )
}
