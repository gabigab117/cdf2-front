import { describe, expect, it } from 'vitest'

describe('useMoneyFormat', () => {
  const { amount } = useMoneyFormat()

  it('writes an amount the French way, in euros', () => {
    /**
     * Given amounts as the API gives them, as texts
     * Then they read with a comma, a space between thousands, and the euro sign after
     */
    expect(amount('380.00')).toBe('380,00 €')
    expect(amount('1260')).toBe('1 260,00 €')
  })

  it('writes a negative amount with a minus sign', () => {
    expect(amount('-37.57')).toBe('−37,57 €')
  })

  it('writes a dash for no amount', () => {
    expect(amount(null)).toBe('—')
  })
})
