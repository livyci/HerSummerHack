import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('apiFetch', () => {
  it('attaches the auth token header when present', async () => {
    localStorage.setItem('token', 'abc123')
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    await apiFetch('/api/purchases/')
    const [, options] = spy.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Token abc123')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('omits the auth header when no token', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    await apiFetch('/api/health/')
    const [, options] = spy.mock.calls[0]
    expect(options.headers['Authorization']).toBeUndefined()
  })
})
