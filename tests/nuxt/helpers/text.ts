/** A text as a member reads it: its no-break spaces (U+00A0, U+202F) become plain spaces. */
export function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}
