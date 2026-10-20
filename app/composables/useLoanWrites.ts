import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type LoanIn = components['schemas']['LoanIn']
type LoanOut = components['schemas']['LoanOut']
type LoanReturnIn = components['schemas']['LoanReturnIn']
type LoanReturnOut = components['schemas']['LoanReturnOut']
type AgreementBody = paths['/api/board/loans/{loan_id}/agreement']['post']['requestBody']['content']['multipart/form-data']

/**
 * Writes the loans. Each write gives what it wrote, or the errors to show on
 * its form; what awaits the board, a loan to prepare or late (A6), is read
 * again.
 */
export function useLoanWrites() {
  const api = useApi()

  /** Records a loan, numbered if it lends to someone. */
  function recordLoan(payload: LoanIn): Promise<Written<LoanOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/loans', { body: payload })))
  }

  /** Rewrites a loan whole, its lines replaced. */
  function changeLoan(id: number, payload: LoanIn): Promise<Written<LoanOut>> {
    return refreshesOverview(formWrite(api.PUT('/api/board/loans/{loan_id}', { params: { path: { loan_id: id } }, body: payload })))
  }

  function path(id: number) {
    return { params: { path: { loan_id: id } } }
  }

  /** « Préparer la sortie »: the loan's equipment leaves, from today. */
  function checkOut(id: number): Promise<Written<LoanOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/loans/{loan_id}/checkout', path(id))))
  }

  /** « Valider le retour »: and the loans to come its damage leaves short. */
  function returnLoan(id: number, payload: LoanReturnIn): Promise<Written<LoanReturnOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/loans/{loan_id}/return', { ...path(id), body: payload })))
  }

  /** « Rouvrir »: the return is undone. */
  function reopenLoan(id: number): Promise<Written<LoanOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/loans/{loan_id}/reopen', path(id))))
  }

  function cancelLoan(id: number): Promise<Written<LoanOut>> {
    return refreshesOverview(formWrite(api.POST('/api/board/loans/{loan_id}/cancel', path(id))))
  }

  /** « Déposer la convention signée »: a document that awaits review, which the bell counts. */
  function uploadAgreement(id: number, file: File): Promise<Written<LoanOut>> {
    const form = new FormData()
    form.append('file', file)
    // openapi-typescript types a file as a string: the form data goes as it
    // is, its Content-Type and boundary left to the browser.
    return refreshesOverview(formWrite(api.POST('/api/board/loans/{loan_id}/agreement', { ...path(id), body: form as unknown as AgreementBody })))
  }

  return { recordLoan, changeLoan, checkOut, returnLoan, reopenLoan, cancelLoan, uploadAgreement }
}
