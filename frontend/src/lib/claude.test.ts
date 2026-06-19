import { describe, expect, it } from 'vitest'
import { excludeOwned } from './claude'

describe('excludeOwned', () => {
  it('removes owned ids while preserving order', () => {
    expect(excludeOwned(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c'])
  })

  it('returns all ids when nothing is owned', () => {
    expect(excludeOwned(['a', 'b'], [])).toEqual(['a', 'b'])
  })

  it('returns empty when everything is owned', () => {
    expect(excludeOwned(['a', 'b'], ['a', 'b'])).toEqual([])
  })
})
