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
