/**
 * #1518 — what the partner is told about the probe account.
 *
 * Probe setup now needs a consent transaction, so `/consent/probe-account` on
 * its own is a page with a disabled button, and the probe user may no longer
 * be a Global Administrator. This form told partners the opposite on both
 * counts. A source check: the form is a client component driven by server
 * actions and this suite runs in a node environment.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(import.meta.dirname, 'TriggerForm.tsx'), 'utf8').replace(/\s+/g, ' ')

describe('TriggerForm — probe account instructions', () => {
  it('does not send the customer to the bare setup page', () => {
    expect(source).not.toContain('/consent/probe-account')
  })

  it('does not invite a Global Admin to be the probe user', () => {
    expect(source).not.toMatch(/Global Admin grants consent/)
    expect(source).toContain('not a Global Administrator or Privileged Role Administrator')
  })

  it('says how the customer gets a working setup link', () => {
    expect(source).toContain('confirmation page shown after they grant admin consent')
    expect(source).toContain('send the customer a fresh consent link')
  })
})
