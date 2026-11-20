import { describe, expect, it } from 'vitest'
import { liveGraphToken } from '../../src/lib/graph'

const nowSeconds = () => Math.floor(Date.now() / 1000)

describe('liveGraphToken', () => {
  it('returns the token when it is not past expiry', () => {
    expect(
      liveGraphToken({ msAccessToken: 'tok', msAccessTokenExpiresAt: nowSeconds() + 300 }),
    ).toBe('tok')
  })

  it("returns '' when the token is past its expiry (refresh failed)", () => {
    expect(
      liveGraphToken({ msAccessToken: 'tok', msAccessTokenExpiresAt: nowSeconds() - 1 }),
    ).toBe('')
  })

  it("returns '' when there is no token", () => {
    expect(liveGraphToken({ msAccessTokenExpiresAt: nowSeconds() + 300 })).toBe('')
    expect(liveGraphToken(null)).toBe('')
  })

  it('forwards the token when no expiry is recorded (unknown → let Graph decide)', () => {
    expect(liveGraphToken({ msAccessToken: 'tok' })).toBe('tok')
  })
})
