/**
 * #1118 — every SDK call names the signed-in human via `X-Portal-User-Oid`,
 * and attribution fails OPEN: no session means the call still goes out,
 * partner-level, rather than failing the partner's action.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMock = vi.hoisted(() => vi.fn())
const fetchMock = vi.hoisted(() =>
  vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}')),
)

vi.mock('../auth', () => ({ auth: authMock }))
vi.stubGlobal('fetch', fetchMock)

const { fetchWithAssertedActor, ASSERTED_ACTOR_OID_HEADER } = await import('./api')

const OID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

function sentHeaders(): Headers {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
  return new Headers(init?.headers)
}

beforeEach(() => {
  authMock.mockReset()
  fetchMock.mockClear()
})

describe('fetchWithAssertedActor (#1118)', () => {
  it('adds the signed-in user object id and keeps the SDK headers', async () => {
    authMock.mockResolvedValue({ user: { oid: OID } })
    await fetchWithAssertedActor('https://api.example/x', {
      headers: { 'X-API-Key': 'pk_test_x', 'X-Portal-Version': '1.0.0' },
    })
    const h = sentHeaders()
    expect(h.get(ASSERTED_ACTOR_OID_HEADER)).toBe(OID)
    expect(h.get('X-API-Key')).toBe('pk_test_x')
    expect(h.get('X-Portal-Version')).toBe('1.0.0')
  })

  it('sends no header, and still sends the request, when nobody is signed in', async () => {
    authMock.mockResolvedValue(null)
    await fetchWithAssertedActor('https://api.example/x', { headers: { 'X-API-Key': 'k' } })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(sentHeaders().get(ASSERTED_ACTOR_OID_HEADER)).toBeNull()
  })

  it('fails open when auth() throws outside a request scope', async () => {
    authMock.mockRejectedValue(new Error('headers() called outside a request scope'))
    await fetchWithAssertedActor('https://api.example/x', {})
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(sentHeaders().get(ASSERTED_ACTOR_OID_HEADER)).toBeNull()
  })

  it('sends no header when the session carries an empty oid', async () => {
    authMock.mockResolvedValue({ user: { oid: '' } })
    await fetchWithAssertedActor('https://api.example/x', {})
    expect(sentHeaders().get(ASSERTED_ACTOR_OID_HEADER)).toBeNull()
  })
})
