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

  it('writes an amount with its sign, as the treasury does', () => {
    /**
     * Given what comes in, what goes out, and nothing
     * Then each reads with its sign, a minus sign rather than a hyphen
     */
    const { signed } = useMoneyFormat()

    expect(signed('1862.50')).toBe('+1\u202F862,50\u00A0€')
    expect(signed(-47.85)).toBe('−47,85\u00A0€')
    expect(signed('0.00')).toBe('+0,00\u00A0€')
    expect(signed(null)).toBe('—')
  })

  it('writes a unit cost to the cent, and finer when its digits tell more', () => {
    /**
     * Given unit costs as the API gives them, to the ten-thousandth
     * Then they read to the cent, and to the ten-thousandth when their digits
     * tell more, as a cup that costs less than a cent
     */
    const { unitAmount } = useMoneyFormat()

    expect(unitAmount('0.5500')).toBe('0,55\u00A0€')
    expect(unitAmount('0.5667')).toBe('0,5667\u00A0€')
    expect(unitAmount('0.0125')).toBe('0,0125\u00A0€')
    expect(unitAmount('9.0000')).toBe('9,00\u00A0€')
    expect(unitAmount(null)).toBe('—')
  })

  it('writes a margin rate to the tenth of a percent', () => {
    const { rate } = useMoneyFormat()

    expect(rate('0.717')).toBe('71,7\u00A0%')
    expect(rate('0.500')).toBe('50\u00A0%')
    expect(rate('-0.125')).toBe('−12,5\u00A0%')
    expect(rate(null)).toBe('—')
  })
})
