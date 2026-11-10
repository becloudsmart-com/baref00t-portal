'use client'

import { useEffect, useRef, useState } from 'react'
import { LogOut, UserCircle } from 'lucide-react'

interface Props {
  name: string
  email: string
  jobTitle?: string | null
  department?: string | null
  /** URL to attempt loading a photo from. The /api/me/photo proxy returns
   *  204 when no photo is available — we detect that and fall back to
   *  initials. Pass null to skip the network call entirely. */
  photoUrl?: string | null
  signOutAction: () => Promise<void>
}

function initialsFor(name: string, email: string): string {
  const source = name?.trim() || email
  if (!source) return '?'
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}

export function UserMenu({ name, email, jobTitle, department, photoUrl, signOutAction }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = initialsFor(name, email)

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Job + department line in the dropdown — render only the populated parts
  // and join with " · " so we don't render orphan separators on Entra
  // tenants that only fill one field.
  const titleLine = [jobTitle, department].filter(Boolean).join(' · ')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-[color:var(--color-bg)]"
      >
        <Avatar initials={initials} photoUrl={photoUrl} />
        <div className="hidden flex-col text-xs leading-tight md:flex">
          <span className="font-medium text-[color:var(--color-text)]">{name || 'Signed in'}</span>
          <span className="text-[color:var(--color-text-muted)]">{email}</span>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] shadow-lg"
        >
          <div className="border-b border-[color:var(--color-border)] px-3 py-2.5">
            <p className="text-sm font-medium text-[color:var(--color-text)]">{name || 'User'}</p>
            <p className="truncate text-xs text-[color:var(--color-text-muted)]">{email}</p>
            {titleLine && (
              <p className="mt-1 truncate text-xs text-[color:var(--color-text-muted)]">{titleLine}</p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            disabled
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[color:var(--color-text-muted)] opacity-60"
            title="Profile editing happens in Microsoft 365 — sign in to your tenant admin"
          >
            <UserCircle className="h-4 w-4" /> Profile (managed in Entra)
          </button>
          <form
            action={async () => {
              await signOutAction()
            }}
          >
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg)]"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function Avatar({ initials, photoUrl }: { initials: string; photoUrl?: string | null }) {
  // Track whether the photo loaded successfully — 204 / 401 / failed-load
  // all collapse to "show initials" without flicker.
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!photoUrl || errored) {
    return <Initials initials={initials} />
  }

  return (
    <span className="relative inline-block h-8 w-8">
      {/* Initials behind the photo so there's no flash-of-empty while loading. */}
      {!loaded && <Initials initials={initials} />}
      <img
        src={photoUrl}
        alt={initials}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`absolute inset-0 h-8 w-8 rounded-full border border-[color:var(--color-border)] object-cover transition-opacity ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}

function Initials({ initials }: { initials: string }) {
  return (
    <span
      className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-[color:var(--color-brand)] text-xs font-semibold text-black"
      aria-hidden
    >
      {initials}
    </span>
  )
}
