import { describe, expect, it } from 'vitest'

describe('useQuantityFormat', () => {
  const { quantity } = useQuantityFormat()

  it('writes a quantity of the stock the French way, with its unit', () => {
    /**
     * Given quantities as the API gives them, as texts
     * Then they read with a comma, a space between thousands, no needless
     * decimal, and their unit after a space that never breaks
     */
    expect(quantity('144.00')).toBe('144')
    expect(quantity('1200.00')).toBe('1\u202F200')
    expect(quantity('1.50', 'kg')).toBe('1,5\u00A0kg')
    expect(quantity(2, 'fûts')).toBe('2\u00A0fûts')
  })
})
