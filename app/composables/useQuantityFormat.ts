// French quantities of the stock: « 1 200 », « 1,5 », to the hundredth at most.
// The space between thousands is the one Intl writes, which never breaks a line.
const QUANTITIES = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

// A quantity never leaves its unit at the end of a line: « 4,5 kg ».
const NO_BREAK_SPACE = ' '

function withUnit(figure: string, unit: string): string {
  return unit ? `${figure}${NO_BREAK_SPACE}${unit}` : figure
}

/** « 144 », « 1,5 kg », « 2 fûts »: how much of an item, with its unit. */
function quantity(value: string | number, unit = ''): string {
  return withUnit(QUANTITIES.format(Number(value)), unit)
}

/**
 * The format of the stock's quantities: the API gives a decimal as a text
 * ("1.50"), which the page writes the French way.
 */
export function useQuantityFormat() {
  return { quantity }
}
