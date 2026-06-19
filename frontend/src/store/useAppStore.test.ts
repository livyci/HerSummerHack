import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './useAppStore'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({
    token: null,
    username: null,
    purchases: [],
    authError: null,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('login', () => {
  it('stores token + username and persists them on success', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 't1', username: 'amy' }))
      .mockResolvedValueOnce(jsonResponse({ product_ids: ['P1'] }))

    const ok = await useAppStore.getState().login('amy', 'pw')

    expect(ok).toBe(true)
    expect(useAppStore.getState().token).toBe('t1')
    expect(useAppStore.getState().username).toBe('amy')
    expect(localStorage.getItem('token')).toBe('t1')
    expect(useAppStore.getState().purchases).toEqual(['P1'])
  })

  it('sets authError and returns false on bad credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ error: 'Invalid username or password.' }, 400),
    )

    const ok = await useAppStore.getState().login('amy', 'wrong')

    expect(ok).toBe(false)
    expect(useAppStore.getState().token).toBeNull()
    expect(useAppStore.getState().authError).toBe('Invalid username or password.')
  })
})

describe('logout', () => {
  it('clears auth state and localStorage', () => {
    useAppStore.setState({ token: 't1', username: 'amy', purchases: ['P1'] })
    localStorage.setItem('token', 't1')
    localStorage.setItem('username', 'amy')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    useAppStore.getState().logout()

    expect(useAppStore.getState().token).toBeNull()
    expect(useAppStore.getState().purchases).toEqual([])
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('markAsBought', () => {
  it('optimistically adds then keeps the id on success', async () => {
    useAppStore.setState({ token: 't1', username: 'amy' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ product_ids: ['P1'] }),
    )

    await useAppStore.getState().markAsBought('P1')

    expect(useAppStore.getState().purchases).toEqual(['P1'])
  })

  it('rolls back the optimistic add on failure', async () => {
    useAppStore.setState({ token: 't1', username: 'amy', purchases: [] })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('err', { status: 500 }))

    await useAppStore.getState().markAsBought('P1')

    expect(useAppStore.getState().purchases).toEqual([])
  })
})
