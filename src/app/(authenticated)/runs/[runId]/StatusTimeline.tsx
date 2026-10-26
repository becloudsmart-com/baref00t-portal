import { Check, Loader2, X, Clock } from 'lucide-react'

type Status = 'queued' | 'running' | 'completed' | 'failed' | string

interface Step {
  key: 'queued' | 'running' | 'finished'
  label: string
  /** Status indicator: pending (not reached), active (current), done (completed), failed (terminal-bad). */
  state: 'pending' | 'active' | 'done' | 'failed'
}

function buildSteps(status: Status): Step[] {
  const isFailed = status === 'failed'
  const isCompleted = status === 'completed'
  const isRunning = status === 'running'
  // queued covers anything else (including unknown forward-compat values).

  const steps: Step[] = [
    { key: 'queued', label: 'Queued', state: 'done' },
    {
      key: 'running',
      label: 'Running',
      state: isCompleted || isFailed ? 'done' : isRunning ? 'active' : 'pending',
    },
    {
      key: 'finished',
      label: isFailed ? 'Failed' : 'Completed',
      state: isCompleted ? 'done' : isFailed ? 'failed' : 'pending',
    },
  ]
  return steps
}

function Icon({ state }: { state: Step['state'] }) {
  if (state === 'done') return <Check className="h-4 w-4" />
  if (state === 'active') return <Loader2 className="h-4 w-4 animate-spin" />
  if (state === 'failed') return <X className="h-4 w-4" />
  return <Clock className="h-4 w-4" />
}

const dotClass: Record<Step['state'], string> = {
  done: 'bg-[color:var(--color-brand)] text-black',
  active: 'bg-[color:var(--color-amber,#d97706)] text-black',
  failed: 'bg-[color:var(--color-red)] text-white',
  pending: 'bg-[color:var(--color-bg-elev)] text-[color:var(--color-text-muted)]',
}

const labelClass: Record<Step['state'], string> = {
  done: 'text-[color:var(--color-text)]',
  active: 'text-[color:var(--color-text)] font-semibold',
  failed: 'text-[color:var(--color-red)]',
  pending: 'text-[color:var(--color-text-muted)]',
}

export function StatusTimeline({ status, runAt }: { status: Status; runAt: string }) {
  const steps = buildSteps(status)
  const startedLabel = (() => {
    try {
      return new Date(runAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    } catch {
      return runAt
    }
  })()

  return (
    <div className="space-y-3">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, i) => (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${dotClass[step.state]}`}
              aria-label={`${step.label} (${step.state})`}
            >
              <Icon state={step.state} />
            </div>
            <span className={`text-sm ${labelClass[step.state]}`}>{step.label}</span>
            {i < steps.length - 1 && (
              <div
                className={`h-px flex-1 ${
                  steps[i + 1]!.state === 'pending'
                    ? 'bg-[color:var(--color-border)]'
                    : 'bg-[color:var(--color-brand)]'
                }`}
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-[color:var(--color-text-muted)]">
        Started: <span className="font-mono">{startedLabel}</span>
      </p>
    </div>
  )
}
