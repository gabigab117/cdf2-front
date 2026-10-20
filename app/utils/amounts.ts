// What a member types as an amount, for the forms of documents, loans and the
// treasury.

/**
 * The amount as the API reads it: « 1 234,50 » becomes "1234.50" (a space of
 * any kind, the non-breaking ones included, is a `\s`). A text that is not a
 * number goes as it is: the API tells what is wrong with it.
 */
export function amountInput(text: string): string | null {
  const amount = text.replace(/[\s€]/g, '').replace(',', '.')
  return amount === '' ? null : amount
}

/** An amount of the API as its field shows it: "150.00" becomes « 150,00 ». */
export function amountField(amount: string): string {
  return amount.replace('.', ',')
}
