// French amounts in euros: « 1 234,50 € ». The space between thousands and the
// one before the sign are those Intl writes, which never break a line.
const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

// The minus sign of a negative amount, rather than a hyphen.
const MINUS = '−'

/** « 1 234,50 € », « −37,57 € », or « — » for no amount at all. */
function amount(value: string | number | null): string {
  if (value === null) return '—'
  return EUROS.format(Number(value)).replace('-', MINUS)
}

/**
 * The format of amounts: the API gives a decimal as a text ("1234.50"), which
 * the page writes the French way.
 */
export function useMoneyFormat() {
  return { amount }
}
