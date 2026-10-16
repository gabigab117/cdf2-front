import { describe, expect, it } from 'vitest'

describe('amountInput', () => {
  it('reads an amount the French way, and no amount for an empty text', () => {
    expect(amountInput('380,00')).toBe('380.00')
    expect(amountInput('1 260,00 €')).toBe('1260.00')
    expect(amountInput('  ')).toBeNull()
  })
})
