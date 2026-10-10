import type { components } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type LoanIn = components['schemas']['LoanIn']
type LoanOut = components['schemas']['LoanOut']

/**
 * Writes the loans. Each write gives what it wrote, or the errors to show on
 * its form; what awaits the board is read again.
 */
export function useLoanWrites() {
  const api = useApi()

  async function written(write: Promise<Written<LoanOut>>): Promise<Written<LoanOut>> {
    const result = await write
    // A loan to prepare or late is shown by the bell and the sidebar (A6).
    if (!result.errors) void refreshBoardOverview()
    return result
  }

  /** Records a loan, numbered if it lends to someone. */
  function recordLoan(payload: LoanIn): Promise<Written<LoanOut>> {
    return written(formWrite(api.POST('/api/board/loans', { body: payload })))
  }

  /** Rewrites a loan whole, its lines replaced. */
  function changeLoan(id: number, payload: LoanIn): Promise<Written<LoanOut>> {
    return written(formWrite(api.PUT('/api/board/loans/{loan_id}', { params: { path: { loan_id: id } }, body: payload })))
  }

  return { recordLoan, changeLoan }
}
