import { describe, expect, it } from 'vitest'
import { validateEnv } from '../../src/env'

const VALID = {
  BAREF00T_API_KEY: 'pk_live_abc123',
  AUTH_SECRET: 'this-is-32-chars-min-long-yesyes!',
  AUTH_URL: 'https://portal.example.com',
  AZURE_AD_TENANT_ID: '11111111-2222-3333-4444-555555555555',
  AZURE_AD_CLIENT_ID: '66666666-7777-8888-9999-aaaaaaaaaaaa',
  AZURE_AD_CLIENT_SECRET: 'whatever',
  BRAND_NAME: 'Test',
  BRAND_PRIMARY_COLOR: '#00cc66',
  // #1008 — deliberately NO NODE_ENV, and a cast rather than `satisfies`.
  //
  // Next augments NodeJS.ProcessEnv to make NODE_ENV non-optional, which is
  // optimistic: at runtime `process.env.NODE_ENV` is frequently absent. This
  // fixture models the real thing, and the "coalesces missing optional values
  // to defaults" test below asserts precisely that an absent NODE_ENV falls
  // back to 'production'.
  //
  // Adding NODE_ENV to satisfy the type destroys that test's purpose — I tried
  // it, and the test went from asserting the default to asserting the value I
  // had just injected. The cast is the honest option: the type is stricter than
  // the runtime, and this file exists to test the runtime.
} as unknown as NodeJS.ProcessEnv
// #1008 — was `as Record<string, string>`, which ProcessEnv rejects because
// Next augments it with a REQUIRED NODE_ENV (TS2345 / TS2741). Nothing to do
// with exactOptionalPropertyTypes — that is not set anywhere in this repo. Every
// call in this file was a type error nobody saw, because the test tree was
// excluded from typecheck.

describe('validateEnv', () => {
  it('accepts a fully valid env', () => {
    const env = validateEnv(VALID)
    expect(env.BAREF00T_API_KEY).toBe('pk_live_abc123')
    expect(env.BAREF00T_API_BASE).toBe('https://api.baref00t.io')
    expect(env.BRAND_THEME).toBe('dark')
    expect(env.LOG_LEVEL).toBe('info')
  })

  it('rejects a malformed BAREF00T_API_KEY prefix', () => {
    expect(() => validateEnv({ ...VALID, BAREF00T_API_KEY: 'whatever' })).toThrow(/BAREF00T_API_KEY/)
  })

  it('rejects a non-GUID AZURE_AD_TENANT_ID', () => {
    expect(() => validateEnv({ ...VALID, AZURE_AD_TENANT_ID: 'nope' })).toThrow(/AZURE_AD_TENANT_ID/)
  })

  it('rejects a short AUTH_SECRET', () => {
    expect(() => validateEnv({ ...VALID, AUTH_SECRET: 'tooShort' })).toThrow(/AUTH_SECRET/)
  })

  it('rejects an invalid BRAND_PRIMARY_COLOR', () => {
    expect(() => validateEnv({ ...VALID, BRAND_PRIMARY_COLOR: 'green' })).toThrow(/BRAND_PRIMARY_COLOR/)
  })

  it('coalesces missing optional values to defaults', () => {
    const env = validateEnv(VALID)
    expect(env.PORT).toBe(3000)
    expect(env.NODE_ENV).toBe('production')
  })

  it('lists multiple errors together', () => {
    try {
      validateEnv({
        ...VALID,
        BAREF00T_API_KEY: 'bad',
        AZURE_AD_TENANT_ID: 'bad',
        BRAND_PRIMARY_COLOR: 'bad',
      })
      expect.fail('should have thrown')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      expect(msg).toContain('BAREF00T_API_KEY')
      expect(msg).toContain('AZURE_AD_TENANT_ID')
      expect(msg).toContain('BRAND_PRIMARY_COLOR')
    }
  })
})
