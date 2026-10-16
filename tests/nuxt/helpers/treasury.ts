import type { components } from '~/types/api'
import { julie } from './events'

type FiscalYearResultsOut = components['schemas']['FiscalYearResultsOut']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type LedgerTotalsOut = components['schemas']['LedgerTotalsOut']
type UnpaidInvoiceOut = components['schemas']['UnpaidInvoiceOut']

/** The drinks of the brocante's bar, advanced by Julie, as the API gives a line. */
export function ledgerEntry(changes: Partial<LedgerEntryOut> = {}): LedgerEntryOut {
  return {
    id: 4,
    date: '2026-09-12',
    kind: 'expense',
    label: 'Courses buvette',
    amount: '286.30',
    category: 'drinks',
    payment_method: 'advance',
    advanced_by: julie,
    reimbursed_on: null,
    reimbursement_method: null,
    event: { id: 3, title: 'Brocante', starts_at: '2026-09-13T05:00:00Z' },
    supplier: '',
    note: '',
    created_by: julie,
    created_at: '2026-09-12T16:00:00Z',
    receipt: null,
    receipt_state: 'missing',
    contact: julie,
    ...changes,
  }
}

/** The sound system's invoice, validated and still to pay, as the bell lists it. */
export function unpaidInvoice(changes: Partial<UnpaidInvoiceOut> = {}): UnpaidInvoiceOut {
  return { id: 21, title: 'Facture — Location sono', issuer: 'Animation 60', amount: '380.00', due_date: '2026-10-28', overdue: false, ...changes }
}

/** Nothing the treasury leaves to the board: no receipt missing, no invoice to pay, no advance owed. */
export const NOTHING_TO_PAY = {
  receipts: { count: 0, items: [] },
  invoices: { count: 0, items: [] },
  advances: { count: 0, total: '0.00', items: [] },
}

function totals(income: string, expense: string, result: string, count: number): LedgerTotalsOut {
  return { income, expense, result, count }
}

/** The results of the mockup's fiscal year, 2026, two of its events kept. */
export function fiscalYearResults(changes: Partial<FiscalYearResultsOut> = {}): FiscalYearResultsOut {
  return {
    year: 2026,
    years: [2026, 2025],
    totals: totals('11490.00', '6921.25', '4568.75', 19),
    events: [
      { event: { id: 3, title: 'Brocante', starts_at: '2026-09-13T05:00:00Z' }, ...totals('4120.00', '980.00', '3140.00', 5) },
      { event: { id: 12, title: 'Halloween des enfants', starts_at: '2026-10-31T14:00:00Z' }, ...totals('0.00', '195.25', '-195.25', 2) },
    ],
    general: totals('1620.00', '366.00', '1254.00', 5),
    ...changes,
  }
}
