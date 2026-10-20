import { describe, expect, it } from 'vitest'

describe('what an address names', () => {
  it('reads an id, or none', () => {
    expect(queryId('12')).toBe(12)
    expect(queryId('-1')).toBeNull()
    expect(queryId(['12'])).toBeNull()
    expect(queryId(undefined)).toBeNull()
  })

  it('reads the page of a list, the first unless it names another', () => {
    expect(queryPage('3')).toBe(3)
    expect(queryPage('1')).toBe(1)
    expect(queryPage('0')).toBe(1)
    expect(queryPage('2.5')).toBe(1)
    expect(queryPage(undefined)).toBe(1)
  })

  it('writes the page of a list, the first needing none', () => {
    expect(pageParam(2)).toBe('2')
    expect(pageParam(1)).toBeUndefined()
  })
})
