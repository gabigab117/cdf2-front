// French amounts in euros: « 1 234,50 € ». The space between thousands and the
// one before the sign are those Intl writes, which never break a line.
const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

// The same, with its sign whatever it is: « +1 862,50 € ».
const SIGNED_EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', signDisplay: 'always' })

// A unit cost (D16): to the cent, and to the ten-thousandth when the API's
// digits tell more: « 0,55 € », « 0,5667 € », « 0,0125 € ».
const UNIT_EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 })

// The minus sign of a negative amount, rather than a hyphen.
const MINUS = '−'

/** « 1 234,50 € », « −37,57 € », or « — » for no amount at all. */
function amount(value: string | number | null): string {
  if (value === null) return '—'
  return EUROS.format(Number(value)).replace('-', MINUS)
}

/** « +1 862,50 € », « −47,85 € »: an amount that comes in or goes out of the treasury. */
function signed(value: string | number | null): string {
  if (value === null) return '—'
  return SIGNED_EUROS.format(Number(value)).replace('-', MINUS)
}

/** « 0,5667 € », « 9,00 € »: a unit cost, or « — » for none. */
function unitAmount(value: string | null): string {
  if (value === null) return '—'
  return UNIT_EUROS.format(Number(value))
}

/**
 * The format of amounts: the API gives a decimal as a text ("1234.50"), which
 * the page writes the French way.
 */
export function useMoneyFormat() {
  return { amount, signed, unitAmount }
}
