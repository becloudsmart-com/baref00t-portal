'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface MultiEmailInputProps {
  /** The form field name to submit. The component renders a hidden input
   *  containing the JSON-stringified array of emails so server actions can
   *  parse it without needing client-side state hoisting. */
  name: string
  /** Optional starting list of emails. */
  defaultValue?: string[]
  /** ID for the visible input (label `for=` target). */
  id?: string
  placeholder?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Chip-style multi-email input. Type → Enter or comma → adds a chip.
 * The committed list is serialized to a hidden `<input name="...">` as JSON
 * so it round-trips through `<form action={...}>` without needing client
 * lift-up.
 */
export function MultiEmailInput({
  name,
  defaultValue = [],
  id,
  placeholder = 'name@example.com',
}: MultiEmailInputProps) {
  const [emails, setEmails] = useState<string[]>(() => defaultValue.filter(Boolean))
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(raw: string) {
    const trimmed = raw.trim().replace(/[,;]+$/, '').trim()
    if (!trimmed) return
    if (!EMAIL_RE.test(trimmed)) {
      setError(`"${trimmed}" is not a valid email`)
      return
    }
    if (emails.includes(trimmed)) {
      setError(`"${trimmed}" is already in the list`)
      return
    }
    setEmails((prev) => [...prev, trimmed])
    setDraft('')
    setError(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && draft === '' && emails.length > 0) {
      // Soft-delete the last chip.
      e.preventDefault()
      setEmails((prev) => prev.slice(0, -1))
      setError(null)
    } else if (e.key === 'Tab' && draft.trim()) {
      // Behave like Enter — commit the in-progress chip without losing focus.
      e.preventDefault()
      commit(draft)
    }
  }

  function onBlur() {
    if (draft.trim()) commit(draft)
  }

  function remove(addr: string) {
    setEmails((prev) => prev.filter((e) => e !== addr))
    setError(null)
    inputRef.current?.focus()
  }

  // Make sure the hidden input always reflects the latest list.
  // (React re-renders sync this without an effect; kept as a noop for clarity.)
  useEffect(() => {
    setError((prev) => (prev && emails.length === 0 && draft === '' ? null : prev))
  }, [emails, draft])

  return (
    <div className="space-y-1">
      <div
        className="flex flex-wrap gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-2 focus-within:ring-2 focus-within:ring-[color:var(--color-brand)]"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((addr) => (
          <span
            key={addr}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-brand-muted)] px-2 py-0.5 text-xs text-[color:var(--color-brand)]"
          >
            {addr}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove(addr)
              }}
              aria-label={`Remove ${addr}`}
              className="ml-0.5 -mr-0.5 rounded-full hover:bg-[color:var(--color-brand)] hover:text-black"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={emails.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[12ch] bg-transparent text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] focus:outline-none"
        />
      </div>
      <p className="text-[11px] text-[color:var(--color-text-muted)]">
        Press <kbd className="rounded bg-[color:var(--color-bg-elev)] px-1">Enter</kbd> or{' '}
        <kbd className="rounded bg-[color:var(--color-bg-elev)] px-1">,</kbd> to add an address.
      </p>
      {error && <p className="text-[11px] text-[color:var(--color-red)]">{error}</p>}
      {/* Hidden input — server action reads this JSON-encoded list. */}
      <input type="hidden" name={name} value={JSON.stringify(emails)} />
    </div>
  )
}
