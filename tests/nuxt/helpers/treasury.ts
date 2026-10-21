import type { components } from '~/types/api'
import { julie } from './events'
import { NO_LOW_STOCK } from './stock'

type FiscalYearResultsOut = components['schemas']['FiscalYearResultsOut']
type GeneralMeetingReportOut = components['schemas']['GeneralMeetingReportOut']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type LedgerTotalsOut = components['schemas']['LedgerTotalsOut']
type ManagementOut = components['schemas']['ManagementOut']
type ManagementRowOut = components['schemas']['ManagementRowOut']
type PendingOut = components['schemas']['PendingOut']
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
    stock_purchase: null,
    stocked_cost: null,
    unstocked_cost: null,
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

/**
 * Nothing awaits the board: no document to review, no loan late or to prepare,
 * nothing in the treasury, no item of the stock below its threshold, no purchase
 * waiting for its cost.
 */
export const NOTHING_PENDING: PendingOut = {
  total: 0,
  documents: { counts: { total: 0, invoice: 0, order: 0, minutes: 0, misc: 0 }, items: [] },
  loans: { overdue: 0, to_prepare: 0, items: [] },
  ...NOTHING_TO_PAY,
  stock: NO_LOW_STOCK,
  unpriced_purchases: { count: 0, items: [] },
}

function totals(income: string, expense: string, result: string, count: number): LedgerTotalsOut {
  return { income, expense, result, count }
}

/** A fiscal year without any line. */
export const NO_TOTALS = totals('0.00', '0.00', '0.00', 0)

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

/** The report of the mockup's fiscal year, 2026, for the general meeting: one receipt missing. */
export function generalMeetingReport(changes: Partial<GeneralMeetingReportOut> = {}): GeneralMeetingReportOut {
  const { year, totals, events, general } = fiscalYearResults()
  return {
    year,
    totals,
    events,
    general,
    income_categories: [
      { category: 'bar', total: '5240.00', count: 5 },
      { category: 'pitches', total: '3130.00', count: 3 },
      { category: 'grant', total: '1500.00', count: 1 },
      { category: 'membership_fees', total: '1620.00', count: 2 },
    ],
    expense_categories: [
      { category: 'food', total: '2180.50', count: 3 },
      { category: 'drinks', total: '1940.75', count: 3 },
      { category: 'equipment_rental', total: '1600.00', count: 1 },
      { category: 'insurance', total: '1200.00', count: 1 },
    ],
    missing_receipts: [ledgerEntry()],
    ...changes,
  }
}

/** A row of the management control: the brocante of the reference scenario (D16). */
function managementRow(changes: Partial<ManagementRowOut> = {}): ManagementRowOut {
  return {
    event: { id: 3, title: 'Brocante', starts_at: '2026-09-13T05:00:00Z' },
    income: '60.00',
    expense: '50.00',
    stocked_purchases: '26.40',
    consumption_cost: '17.00',
    management_result: '19.40',
    bar_margin: '43.00',
    margin_rate: '0.717',
    unlinked_purchases: '0.00',
    ...changes,
  }
}

/**
 * The management control of the reference scenario (D16): the brocante's
 * shopping, 50,00 €, put 48 cans in stock; 24 more came without an expense;
 * the bar consumed 30 and took 60,00 €; a stocktake found 2 missing.
 */
export function managementReport(changes: Partial<ManagementOut> = {}): ManagementOut {
  return {
    year: 2026,
    years: [2026, 2025],
    events: [managementRow()],
    general: managementRow({
      event: null,
      income: '0.00',
      expense: '0.00',
      stocked_purchases: '0.00',
      consumption_cost: '1.13',
      management_result: '-1.13',
      bar_margin: '-1.13',
      margin_rate: null,
      unlinked_purchases: '14.40',
    }),
    totals: {
      result: '10.00',
      opening_value: '0.00',
      closing_value: '22.67',
      stock_change: '22.67',
      adjusted_result: '32.67',
      management_result: '18.27',
    },
    stock: {
      categories: [
        { category: 'drinks', value: '22.67' },
        { category: 'food', value: '0.00' },
        { category: 'supplies', value: '0.00' },
        { category: 'lotto_raffle', value: '0.00' },
      ],
      losses: {
        total: '1.13',
        items: [{ item: { id: 1, name: 'Canettes de soda 33 cl', unit: '' }, quantity: '2.00', value: '1.13' }],
      },
    },
    reconciliation: {
      management_result: '18.27',
      unlinked_purchases: '14.40',
      paid_another_year: '0.00',
      recorded_another_year: '0.00',
      adjusted_result: '32.67',
    },
    controls: { unpriced_purchases: 0, unlinked_purchases: 1, unvalued_items: 0 },
    ...changes,
  }
}
