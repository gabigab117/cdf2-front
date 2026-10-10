import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type DocumentIn = components['schemas']['DocumentIn']
type DocumentOut = components['schemas']['DocumentOut']
type DocumentCategory = components['schemas']['DocumentCategory']
type UploadBody = paths['/api/board/documents']['post']['requestBody']['content']['multipart/form-data']

/** How the member classifies the file they deposit. */
export interface UploadFields {
  category: DocumentCategory
  title: string
  event: number | null
}

/** A document's file: to open, or to download under its name. */
type DocumentFile = Pick<DocumentOut, 'id' | 'original_name'>

/**
 * Writes the board's documents, and reads their files. Each write gives what
 * it wrote, or the errors to show on its form; the page fetches the lists
 * again.
 */
export function useDocumentWrites() {
  const api = useApi()

  /** Deposits a file, classified: the document awaits review. */
  function uploadDocument(file: File, fields: UploadFields): Promise<Written<DocumentOut>> {
    const form = new FormData()
    form.append('file', file)
    form.append('category', fields.category)
    // A field left empty is left out: the API reads an empty value as given.
    if (fields.title) form.append('title', fields.title)
    if (fields.event !== null) form.append('event', String(fields.event))
    // openapi-typescript types a file as a string: the form data goes as it
    // is, openapi-fetch leaving its Content-Type, and boundary, to the browser.
    return formWrite(api.POST('/api/board/documents', { body: form as unknown as UploadBody }))
  }

  /** Rewrites a document whole: the « Corriger » form. */
  function correctDocument(id: number, payload: DocumentIn): Promise<Written<DocumentOut>> {
    const path = { document_id: id }
    return formWrite(api.PUT('/api/board/documents/{document_id}', { params: { path }, body: payload }))
  }

  /** Validates a document: minutes create the tasks they list. */
  function validateDocument(id: number): Promise<Written<DocumentOut>> {
    return formWrite(api.POST('/api/board/documents/{document_id}/validate', { params: { path: { document_id: id } } }))
  }

  /** @returns null once deleted, or the message to show. */
  function deleteDocument(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/documents/{document_id}', { params: { path: { document_id: id } } }))
  }

  function fetchFile(document: DocumentFile) {
    return api.GET('/api/board/documents/{document_id}/file', {
      params: { path: { document_id: document.id }, query: { download: false } },
      parseAs: 'blob',
    })
  }

  /**
   * Opens a document's file in a new tab. To be called from the click, before
   * any `await` (openFile()).
   *
   * @returns null once opened, or the message to show.
   */
  function openDocument(document: DocumentFile): Promise<string | null> {
    return fileResult(openFile(() => fetchFile(document), document.original_name))
  }

  /** @returns null once downloaded, or the message to show. */
  function downloadDocument(document: DocumentFile): Promise<string | null> {
    return fileResult(downloadFile(() => fetchFile(document), document.original_name))
  }

  return { uploadDocument, correctDocument, validateDocument, deleteDocument, openDocument, downloadDocument }
}

async function fileResult(request: Promise<{ error?: unknown, response: Response }>): Promise<string | null> {
  try {
    const { error, response } = await request
    return response.ok ? null : errorMessage(error, response)
  }
  catch (failure) {
    return errorMessage(failure)
  }
}
