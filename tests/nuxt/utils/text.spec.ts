import { describe, expect, it } from 'vitest'

describe('the texts of the board', () => {
  it('starts a sentence with a capital', () => {
    expect(capitalized('fait le 25 sept.')).toBe('Fait le 25 sept.')
  })

  it('writes a count and its word, the singular below two', () => {
    expect(countText(0, 'jour', 'jours')).toBe('0 jour')
    expect(countText(1, 'jour', 'jours')).toBe('1 jour')
    expect(countText(3, 'jour', 'jours')).toBe('3 jours')
  })
})
