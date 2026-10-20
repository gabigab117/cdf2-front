import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type DocumentIn = components['schemas']['DocumentIn']
type DocumentOut = components['schemas']['DocumentOut']
type DocumentCategory = components['schemas']['DocumentCategory']
type SwornStatementIn = components['schemas']['SwornStatementIn']
type UploadBody = paths['/api/board/documents']['post']['requestBody']['content']['multipart/form-data']

/** How the member classifies the file they upload. */
export interface UploadFields {
  category: DocumentCategory
  title: string
  event: number | null
}

/** A document's file: to show, or to download under its name. */
type DocumentFile = Pick<DocumentOut, 'id' | 'original_name'>

/**
 * Writes the board's documents, and reads their files. Each write gives what
 * it wrote, or the errors to show on its form; the page fetches the lists
 * again, and the bell what awaits the board.
 */
export function useDocumentWrites() {
  const api = useApi()

  async function written<T>(write: Promise<Written<T>>): Promise<Written<T>> {
    const result = await write
    // A document to review, an invoice to pay are shown by the bell (A6).
    if (!result.errors) void refreshBoardOverview()
    return result
  }

  /** Uploads a file, classified: the document awaits review. */
  function uploadDocument(file: File, fields: UploadFields): Promise<Written<DocumentOut>> {
    const form = new FormData()
    form.append('file', file)
    form.append('category', fields.category)
    // A field left empty is left out: the API reads an empty value as given.
    if (fields.title) form.append('title', fields.title)
    if (fields.event !== null) form.append('event', String(fields.event))
    // openapi-typescript types a file as a string: the form data goes as it
    // is, openapi-fetch leaving its Content-Type, and boundary, to the browser.
    return written(formWrite(api.POST('/api/board/documents', { body: form as unknown as UploadBody })))
  }

  /**
   * Attests a purchase whose receipt was lost, on the member's honour: its PDF
   * is filed as an invoice, which awaits review.
   */
  function attestPurchase(payload: SwornStatementIn): Promise<Written<DocumentOut>> {
    return written(formWrite(api.POST('/api/board/documents/statements', { body: payload })))
  }

  /** Rewrites a document whole: the « Corriger » form. */
  function updateDocument(id: number, payload: DocumentIn): Promise<Written<DocumentOut>> {
    const path = { document_id: id }
    return written(formWrite(api.PUT('/api/board/documents/{document_id}', { params: { path }, body: payload })))
  }

  /** Validates a document: minutes create the tasks they list. */
  function validateDocument(id: number): Promise<Written<DocumentOut>> {
    return written(formWrite(api.POST('/api/board/documents/{document_id}/validate', { params: { path: { document_id: id } } })))
  }

  /** @returns null once deleted, or the message to show. */
  async function deleteDocument(id: number): Promise<string | null> {
    const failure = await plainWrite(api.DELETE('/api/board/documents/{document_id}', { params: { path: { document_id: id } } }))
    if (failure === null) void refreshBoardOverview()
    return failure
  }

  function fetchFile(document: DocumentFile) {
    return api.GET('/api/board/documents/{document_id}/file', {
      params: { path: { document_id: document.id }, query: { download: false } },
      parseAs: 'blob',
    })
  }

  /** @returns the file, of the type the server sent, or the message to show. */
  async function readDocumentFile(document: DocumentFile): Promise<{ file: Blob } | { failure: string }> {
    try {
      const { data, error, response } = await fetchFile(document)
      return response.ok && data ? { file: data } : { failure: errorMessage(error, response) }
    }
    catch (failure) {
      return { failure: errorMessage(failure) }
    }
  }

  /** @returns null once downloaded, or the message to show. */
  function downloadDocument(document: DocumentFile): Promise<string | null> {
    return downloadFile(() => fetchFile(document), document.original_name)
  }

  return { uploadDocument, attestPurchase, updateDocument, validateDocument, deleteDocument, readDocumentFile, downloadDocument }
}
