import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'
import type { EntryFields } from '~/utils/treasury'

type DocumentOut = components['schemas']['DocumentOut']
type InvoiceExpenseIn = components['schemas']['InvoiceExpenseIn']
type LedgerEntryIn = components['schemas']['LedgerEntryIn']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type RecordContent = paths['/api/board/treasury/entries']['post']['requestBody']['content']
type RecordBody = RecordContent[keyof RecordContent]
type ReceiptBody = paths['/api/board/treasury/entries/{entry_id}/receipt']['post']['requestBody']['content']['multipart/form-data']

/**
 * Writes the journal. Each write gives what it wrote, or the errors to show on
 * its form; the page reads its figures and its lines again, and the bell what
 * the treasury leaves to do.
 */
export function useTreasuryWrites() {
  const api = useApi()

  async function written<T>(write: Promise<Written<T>>): Promise<Written<T>> {
    const result = await write
    // A receipt missing and an invoice to pay are shown by the bell (A6).
    if (!result.errors) void refreshBoardOverview()
    return result
  }

  function path(id: number) {
    return { params: { path: { entry_id: id } } }
  }

  /**
   * Records a line, from the journal's form, with its receipt if a file comes:
   * a field left empty is not sent.
   */
  function recordEntry(fields: EntryFields, file: File | null = null): Promise<Written<LedgerEntryOut>> {
    const form = new FormData()
    for (const [name, value] of Object.entries(entryPayload(fields))) {
      if (value !== null && value !== '') form.append(name, String(value))
    }
    if (file) form.append('file', file)
    // openapi-typescript types the form as an object: the form data goes as it
    // is, its Content-Type and boundary left to the browser.
    return written(formWrite(api.POST('/api/board/treasury/entries', { body: form as unknown as RecordBody })))
  }

  /** Rewrites a line whole: its receipt and its reimbursement stay as they are. */
  function correctEntry(id: number, payload: LedgerEntryIn): Promise<Written<LedgerEntryOut>> {
    return written(formWrite(api.PUT('/api/board/treasury/entries/{entry_id}', { ...path(id), body: payload })))
  }

  /** Deletes a line: null once done, or the message to show. */
  async function deleteEntry(id: number): Promise<string | null> {
    const failure = await plainWrite(api.DELETE('/api/board/treasury/entries/{entry_id}', path(id)))
    if (failure === null) void refreshBoardOverview()
    return failure
  }

  /** « Joindre le justificatif »: the document that proves a line that has none. */
  function attachReceipt(id: number, file: File): Promise<Written<LedgerEntryOut>> {
    const form = new FormData()
    form.append('file', file)
    return written(formWrite(api.POST('/api/board/treasury/entries/{entry_id}/receipt', { ...path(id), body: form as unknown as ReceiptBody })))
  }

  /** « Valider et créer l’écriture », « Marquer payée »: the expense of an invoice. */
  function createInvoiceExpense(documentId: number, payload: InvoiceExpenseIn): Promise<Written<DocumentOut>> {
    return written(formWrite(api.POST('/api/board/treasury/invoices/{document_id}/expense', {
      params: { path: { document_id: documentId } },
      body: payload,
    })))
  }

  /** « Ligne déjà saisie »: the invoice proves an expense entered without its receipt. */
  function attachInvoice(documentId: number, entryId: number): Promise<Written<DocumentOut>> {
    return written(formWrite(api.POST('/api/board/treasury/invoices/{document_id}/attach', {
      params: { path: { document_id: documentId } },
      body: { entry: entryId },
    })))
  }

  return { recordEntry, correctEntry, deleteEntry, attachReceipt, createInvoiceExpense, attachInvoice }
}
