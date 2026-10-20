import { describe, expect, it } from 'vitest'

describe('amountInput', () => {
  it('reads an amount the French way, and no amount for an empty text', () => {
    expect(amountInput('380,00')).toBe('380.00')
    expect(amountInput('1 260,00 €')).toBe('1260.00')
    expect(amountInput('  ')).toBeNull()
  })
})

describe('amountField', () => {
  it('writes an amount of the API as its field shows it', () => {
    expect(amountField('150.00')).toBe('150,00')
    expect(amountField('1260.50')).toBe('1260,50')
  })
})
