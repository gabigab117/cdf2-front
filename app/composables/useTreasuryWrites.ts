import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'
import type { EntryFields } from '~/utils/treasury'

type LedgerEntryIn = components['schemas']['LedgerEntryIn']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type RecordContent = paths['/api/board/treasury/entries']['post']['requestBody']['content']
type RecordBody = RecordContent[keyof RecordContent]

/**
 * Writes the journal. Each write gives what it wrote, or the errors to show on
 * its form; the page reads its figures and its lines again.
 */
export function useTreasuryWrites() {
  const api = useApi()

  /** Records a line, from the journal's form: a field left empty is not sent. */
  function recordEntry(fields: EntryFields): Promise<Written<LedgerEntryOut>> {
    const form = new FormData()
    for (const [name, value] of Object.entries(entryPayload(fields))) {
      if (value !== null && value !== '') form.append(name, String(value))
    }
    // openapi-typescript types the form as an object: the form data goes as it
    // is, its Content-Type and boundary left to the browser.
    return formWrite(api.POST('/api/board/treasury/entries', { body: form as unknown as RecordBody }))
  }

  /** Rewrites a line whole: its receipt and its reimbursement stay as they are. */
  function correctEntry(id: number, payload: LedgerEntryIn): Promise<Written<LedgerEntryOut>> {
    return formWrite(api.PUT('/api/board/treasury/entries/{entry_id}', { params: { path: { entry_id: id } }, body: payload }))
  }

  /** Deletes a line: null once done, or the message to show. */
  function deleteEntry(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/treasury/entries/{entry_id}', { params: { path: { entry_id: id } } }))
  }

  return { recordEntry, correctEntry, deleteEntry }
}
