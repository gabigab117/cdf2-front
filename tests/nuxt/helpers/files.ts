import type { DOMWrapper } from '@vue/test-utils'
import { vi } from 'vitest'

/**
 * Says whether the browser has a PDF viewer: happy-dom has none to tell of.
 * Undone by forgetPdfViewer().
 */
export function pdfViewer(enabled: boolean): void {
  Object.defineProperty(navigator, 'pdfViewerEnabled', { value: enabled, configurable: true })
}

export function forgetPdfViewer(): void {
  Reflect.deleteProperty(navigator, 'pdfViewerEnabled')
}

/** Chooses files in a file input, as the browser's picker would: happy-dom has none. */
export function chooseFiles(input: Pick<DOMWrapper<Element>, 'element' | 'trigger'>, files: File[]): Promise<void> {
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  return input.trigger('change')
}

/** Chooses a file in a file input, as chooseFiles(). */
export function chooseFile(input: Pick<DOMWrapper<Element>, 'element' | 'trigger'>, file: File): Promise<void> {
  return chooseFiles(input, [file])
}

/**
 * Stands in for the URLs the browser makes of files, and releases: each file gets
 * `url`. Undone by vi.restoreAllMocks().
 */
export function stubObjectUrls(url = 'blob:http://localhost:3000/photo'): void {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue(url)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
}
