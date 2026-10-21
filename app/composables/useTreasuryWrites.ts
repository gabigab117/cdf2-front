import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'
import type { LineFields } from '~/utils/stock'
import type { EntryFields } from '~/utils/treasury'

type DocumentOut = components['schemas']['DocumentOut']
type ExistingPurchaseIn = components['schemas']['ExistingPurchaseIn']
type InvoiceExpenseIn = components['schemas']['InvoiceExpenseIn']
type LedgerEntryIn = components['schemas']['LedgerEntryIn']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type ReimbursementIn = components['schemas']['ReimbursementIn']
type RecordContent = paths['/api/board/treasury/entries']['post']['requestBody']['content']
type RecordBody = RecordContent[keyof RecordContent]
type ReceiptBody = paths['/api/board/treasury/entries/{entry_id}/receipt']['post']['requestBody']['content']['multipart/form-data']

/**
 * Writes the ledger. Each write gives what it wrote, or the errors to show on
 * its form; the page reads its figures and its lines again, and the bell what
 * the treasury leaves to do: a receipt missing, an invoice to pay, an advance
 * owed (A6).
 */
export function useTreasuryWrites() {
  const api = useApi()

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
    return refreshesOverview(formWrite(api.POST('/api/board/treasury/entries', { body: form as unknown as RecordBody })))
  }

  /** Rewrites a line whole: its receipt and its reimbursement stay as they are. */
  function updateEntry(id: number, payload: LedgerEntryIn): Promise<Written<LedgerEntryOut>> {
    return refreshesOverview(formWrite(api.PUT('/api/board/treasury/entries/{entry_id}', { ...path(id), body: payload })))
  }

  /** Deletes a line: null once done, or the message to show. */
  function deleteEntry(id: number): Promise<string | null> {
    return refreshesOverview(plainWrite(api.DELETE('/api/board/treasury/entries/{entry_id}', path(id))))
  }

  /** « Joindre le justificatif »: the document that proves a line that has none. */
  function attachReceipt(id: number, file: File): Promise<Written<LedgerEntryOut>> {
    const form = new FormData()
    form.append('file', file)
    return refreshesOverview(formWrite(api.POST('/api/board/treasury/entries/{entry_id}/receipt', { ...path(id), body: form as unknown as ReceiptBody })))
  }

  /** « Valider et créer l’écriture », « Marquer payée »: the expense of an invoice. */
  function createInvoiceExpense(documentId: number, payload: InvoiceExpenseIn): Promise<Written<DocumentOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/treasury/invoices/{document_id}/expense', {
      params: { path: { document_id: documentId } },
      body: payload,
    })))
  }

  /** « Ligne déjà saisie »: the invoice proves an expense entered without its receipt. */
  function attachInvoice(documentId: number, entryId: number): Promise<Written<DocumentOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/treasury/invoices/{document_id}/attach', {
      params: { path: { document_id: documentId } },
      body: { entry: entryId },
    })))
  }

  /** « Marquer remboursée »: the advance paid back, on a day, by a method. */
  function markReimbursed(id: number, payload: ReimbursementIn): Promise<Written<LedgerEntryOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/treasury/entries/{entry_id}/reimbursement', { ...path(id), body: payload })))
  }

  /** « Annuler le remboursement »: the advance owed again. */
  function cancelReimbursement(id: number): Promise<Written<LedgerEntryOut>> {
    return refreshesOverview(formWrite(api.DELETE('/api/board/treasury/entries/{entry_id}/reimbursement', path(id))))
  }

  /** « Mettre en stock » (D16): the purchase an expense paid, recorded in the stock, each line with its cost. */
  function createStockPurchase(id: number, lines: LineFields[]): Promise<Written<LedgerEntryOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/treasury/entries/{entry_id}/stock-purchase', { ...path(id), body: { lines: purchaseLinesPayload(lines) } })))
  }

  /** « Achat déjà saisi » (D16): a purchase recorded in the stock, paid by the expense, each line's cost given. */
  function linkExistingPurchase(id: number, payload: ExistingPurchaseIn): Promise<Written<LedgerEntryOut>> {
    return refreshesOverview(formWrite(api.PUT('/api/board/treasury/entries/{entry_id}/stock-purchase', { ...path(id), body: payload })))
  }

  /** « Retirer »: the expense pays its purchase no more; it stays in the stock. */
  function unlinkStockPurchase(id: number): Promise<Written<LedgerEntryOut>> {
    return refreshesOverview(formWrite(api.DELETE('/api/board/treasury/entries/{entry_id}/stock-purchase', path(id))))
  }

  return {
    recordEntry,
    updateEntry,
    deleteEntry,
    attachReceipt,
    createInvoiceExpense,
    attachInvoice,
    markReimbursed,
    cancelReimbursement,
    createStockPurchase,
    linkExistingPurchase,
    unlinkStockPurchase,
  }
}
