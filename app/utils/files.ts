/** The files the board may deposit, as the file picker offers them (D9). */
export const DOCUMENT_TYPES = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

/** « 120 Ko », « 1,2 Mo »: the size of a file as the board reads it. */
export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** A file fetched through the API: `api.GET(…, { parseAs: 'blob' })`. */
interface FileFetch {
  data?: Blob
}

// Types the browser shows without running anything in the application's origin.
// The documents are stored as PDF or WebP (D9).
const INLINE_TYPES: ReadonlySet<string> = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

// Time left to the browser to load an object URL before it is released.
const REVOKE_DELAY_MS = 60_000

/**
 * Opens a protected file in a new tab.
 *
 * To be called from the click handler, before any `await`: the tab opens at once
 * and receives the file once it has arrived, since a tab opened later would no
 * longer follow the click and would be blocked as a pop-up. A file of a type the
 * browser should not show, or one whose tab could not open, is downloaded
 * instead.
 *
 * @returns The API's answer, for the caller to show its error, if any.
 */
export async function openFile<T extends FileFetch>(load: () => Promise<T>, filename: string): Promise<T> {
  const tab = window.open('', '_blank')
  let result: T
  try {
    result = await load()
  }
  catch (error) {
    tab?.close()
    throw error
  }
  const file = result.data
  if (file && tab && INLINE_TYPES.has(mediaType(file))) {
    // The file's page must not reach back into the application.
    tab.opener = null
    tab.location.href = objectUrl(file)
    return result
  }
  tab?.close()
  if (file) save(file, filename)
  return result
}

/**
 * Downloads a protected file under the given name.
 *
 * @returns The API's answer, for the caller to show its error, if any.
 */
export async function downloadFile<T extends FileFetch>(load: () => Promise<T>, filename: string): Promise<T> {
  const result = await load()
  if (result.data) save(result.data, filename)
  return result
}

function save(file: Blob, filename: string): void {
  const link = document.createElement('a')
  link.href = objectUrl(file)
  link.download = filename
  link.click()
}

// The blob carries the type the server sent with the file, and so does its URL:
// the type is never guessed on this side.
function objectUrl(file: Blob): string {
  const url = URL.createObjectURL(file)
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
  return url
}

// The media type without its parameters ("text/plain;charset=utf-8").
function mediaType(file: Blob): string {
  const [type = ''] = file.type.split(';')
  return type.trim().toLowerCase()
}
