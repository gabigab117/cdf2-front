/** A text with its first letter in capital, as a sentence starts: « Fait le 25 sept. ». */
export function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}
