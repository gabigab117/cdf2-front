/** A text with its first letter in capital, as a sentence starts: « Fait le 25 sept. ». */
export function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/**
 * « 1 jour », « 3 jours »: a count and its word, French taking the singular
 * below two, as the API writes it (count_text).
 */
export function countText(count: number, one: string, many: string): string {
  return `${count} ${count < 2 ? one : many}`
}
