import type { DOMWrapper } from '@vue/test-utils'

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

/** Chooses a file in a file input, as the browser's picker would: happy-dom has none. */
export function chooseFile(input: Pick<DOMWrapper<Element>, 'element' | 'trigger'>, file: File): Promise<void> {
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  return input.trigger('change')
}
