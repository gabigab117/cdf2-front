/** The files the board may upload, as the file picker offers them (D9). */
export const DOCUMENT_TYPES = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

/** The photos the file picker of an album offers: its images, HEIC of an iPhone included. */
export const PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

/** The title a file gives to start with: its name, without its extension. */
export function fileTitle(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/** « 120 Ko », « 1,2 Mo »: the size of a file as the board reads it. */
export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** A file fetched through the API: `api.GET(…, { parseAs: 'blob' })`. */
interface FileFetch {
  data?: Blob
  error?: unknown
  response: Response
}

/** How the page shows a file it can show. */
export type FileView = 'image' | 'pdf'

// Images the page shows without running anything in the application's origin.
// The documents are stored as PDF or WebP (D9).
const IMAGE_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Time left to the browser to load an object URL before it is released.
const REVOKE_DELAY_MS = 60_000

/**
 * How the page shows a protected file, by the type the server sent with it: an
 * image, a PDF in the browser's own viewer, or nothing, the file being then
 * only downloaded. A browser without a PDF viewer, as on some phones, would
 * download the PDF instead of showing it.
 */
export function fileView(file: Blob): FileView | null {
  const type = mediaType(file)
  if (IMAGE_TYPES.has(type)) return 'image'
  if (type === 'application/pdf' && navigator.pdfViewerEnabled) return 'pdf'
  return null
}

/**
 * Downloads a protected file under the given name.
 *
 * @returns null once downloaded, or the message to show.
 */
export async function downloadFile(load: () => Promise<FileFetch>, filename: string): Promise<string | null> {
  try {
    const { data, error, response } = await load()
    if (data) save(data, filename)
    return response.ok ? null : errorMessage(error, response)
  }
  catch (failure) {
    return errorMessage(failure)
  }
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

/**
 * The files a member chose in a file input, which is emptied: the same files
 * chosen again are a new choice. One, unless the input takes several.
 */
export function chosenFiles(event: Event): File[] {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  return files
}

/** The file a member chose in a file input, which is emptied, as chosenFiles(). */
export function chosenFile(event: Event): File | null {
  return chosenFiles(event)[0] ?? null
}
