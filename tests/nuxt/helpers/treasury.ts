import type { components } from '~/types/api'
import { julie } from './events'

type FiscalYearResultsOut = components['schemas']['FiscalYearResultsOut']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type LedgerTotalsOut = components['schemas']['LedgerTotalsOut']

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
    ...changes,
  }
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
