import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { components, paths } from '~/types/api'
import type { Option } from '~/utils/event-form'

type LedgerCategory = components['schemas']['LedgerCategory']
type LedgerEntryIn = components['schemas']['LedgerEntryIn']
type LedgerEntryKind = components['schemas']['LedgerEntryKind']
type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type LedgerPaymentMethod = components['schemas']['LedgerPaymentMethod']
type LedgerReceiptState = components['schemas']['LedgerReceiptState']
type ReimbursementMethod = components['schemas']['ReimbursementMethod']
type LedgerQuery = NonNullable<paths['/api/board/treasury/entries']['get']['parameters']['query']>

/** The Trésorerie page: its figures, its form and the latest lines of its journal. */
export const TREASURY_PATH = '/bureau/tresorerie'

/** The whole journal of a fiscal year, by page. */
export const LEDGER_PATH = `${TREASURY_PATH}/journal`

/** The form of a new line, on the Trésorerie page: the « Nouveau » menu leads to it. */
export const NEW_LINE_ANCHOR = 'nouvelle-ligne'

/** An expense entered on a phone, its ticket taken in photo. */
export const NEW_EXPENSE_PATH = `${TREASURY_PATH}/nouvelle`

/** The report of a fiscal year for the general meeting, to print. */
export const REPORT_PATH = `${TREASURY_PATH}/bilan`

/** The page of a line: its detail, its correction and its deletion. */
export function entryPath(id: number): string {
  return `${TREASURY_PATH}/ecritures/${id}`
}

/** How many lines the Trésorerie page shows, the latest first. */
export const LATEST_LINES = 10

/** How many lines a page of the whole journal holds. */
export const LEDGER_PAGE_SIZE = 25

export const KIND_LABELS: Readonly<Record<LedgerEntryKind, string>> = {
  expense: 'Dépense',
  income: 'Recette',
}

export const CATEGORY_LABELS: Readonly<Record<LedgerCategory, string>> = {
  food: 'Achats alimentaires',
  drinks: 'Boissons',
  equipment_rental: 'Location de matériel',
  decoration: 'Décoration',
  prizes: 'Lots et cadeaux',
  insurance: 'Assurance',
  bank_fees: 'Frais bancaires',
  bar: 'Buvette',
  pitches: 'Emplacements',
  tickets: 'Entrées et tickets',
  grant: 'Subvention',
  membership_fees: 'Cotisations',
  donations: 'Dons',
  misc: 'Divers',
}

/** « par virement »: how an advance was paid back, within a sentence. */
export const REIMBURSED_BY: Readonly<Record<ReimbursementMethod, string>> = {
  cash: 'en espèces',
  cheque: 'par chèque',
  transfer: 'par virement',
}

/** The categories of each kind, in the order of the form: the API refuses any other. */
const KIND_CATEGORIES: Readonly<Record<LedgerEntryKind, readonly LedgerCategory[]>> = {
  expense: ['food', 'drinks', 'equipment_rental', 'decoration', 'prizes', 'insurance', 'bank_fees', 'misc'],
  income: ['bar', 'pitches', 'tickets', 'grant', 'membership_fees', 'donations', 'misc'],
}

export const PAYMENT_METHOD_LABELS: Readonly<Record<LedgerPaymentMethod, string>> = {
  association_card: 'Carte de l’association',
  cash: 'Espèces',
  cheque: 'Chèque',
  transfer: 'Virement',
  direct_debit: 'Prélèvement',
  advance: 'Avancé par un membre',
}

/** How the committee pays an advance back, in the order of the form. */
export const REIMBURSEMENT_METHOD_OPTIONS: ReadonlyArray<Option<ReimbursementMethod>> = (['cash', 'cheque', 'transfer'] as const)
  .map(method => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }))

// An income is never advanced by a member: the API refuses it.
const KIND_PAYMENT_METHODS: Readonly<Record<LedgerEntryKind, readonly LedgerPaymentMethod[]>> = {
  expense: ['association_card', 'cash', 'cheque', 'transfer', 'direct_debit', 'advance'],
  income: ['association_card', 'cash', 'cheque', 'transfer', 'direct_debit'],
}

/** The categories to choose from for a kind of line. */
export function categoryOptions(kind: LedgerEntryKind): Option<LedgerCategory>[] {
  return KIND_CATEGORIES[kind].map(category => ({ value: category, label: CATEGORY_LABELS[category] }))
}

/** The payment methods to choose from for a kind of line. */
export function paymentMethodOptions(kind: LedgerEntryKind): Option<LedgerPaymentMethod>[] {
  return KIND_PAYMENT_METHODS[kind].map(method => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }))
}

/** What a new line of each kind starts with, as in the mockup. */
const KIND_DEFAULTS: Readonly<Record<LedgerEntryKind, { category: LedgerCategory, paymentMethod: LedgerPaymentMethod }>> = {
  expense: { category: 'food', paymentMethod: 'association_card' },
  income: { category: 'bar', paymentMethod: 'cash' },
}

/** What the form of a line edits: the amount as typed, « 286,30 »; the date, « 2026-09-12 ». */
export interface EntryFields {
  kind: LedgerEntryKind
  label: string
  amount: string
  date: string
  category: LedgerCategory
  paymentMethod: LedgerPaymentMethod
  advancedBy: number | null
  event: number | null
  supplier: string
  note: string
}

/** A new line of a kind, dated of a day. */
export function newEntryFields(kind: LedgerEntryKind, day: string): EntryFields {
  return {
    kind,
    label: '',
    amount: '',
    date: day,
    ...KIND_DEFAULTS[kind],
    advancedBy: null,
    event: null,
    supplier: '',
    note: '',
  }
}

/**
 * The line switched to another kind: it takes that kind's category and payment
 * method, as in the mockup, and keeps what is typed.
 */
export function withKind(fields: EntryFields, kind: LedgerEntryKind): EntryFields {
  return { ...fields, kind, ...KIND_DEFAULTS[kind], advancedBy: null }
}

/** The fields of a line to correct, as the API gave it. */
export function entryFields(entry: LedgerEntryOut): EntryFields {
  return {
    kind: entry.kind,
    label: entry.label,
    amount: entry.amount.replace('.', ','),
    date: entry.date,
    category: entry.category,
    paymentMethod: entry.payment_method,
    advancedBy: entry.advanced_by?.id ?? null,
    event: entry.event?.id ?? null,
    supplier: entry.supplier,
    note: entry.note,
  }
}

/**
 * Whether the mockup's form may send the line: a label, and an amount above
 * zero. Every other rule is the API's.
 */
export function isEntryComplete({ label, amount }: Pick<EntryFields, 'label' | 'amount'>): boolean {
  return label.trim() !== '' && Number(amountInput(amount)) > 0
}

/** The line to send, whole: the journal's form leaves out its empty fields. */
export function entryPayload(fields: EntryFields): LedgerEntryIn {
  return {
    date: fields.date,
    kind: fields.kind,
    label: fields.label,
    amount: amountInput(fields.amount) ?? '',
    category: fields.category,
    payment_method: fields.paymentMethod,
    // Only an advance names a member.
    advanced_by: fields.paymentMethod === 'advance' ? fields.advancedBy : null,
    event: fields.event,
    supplier: fields.supplier,
    note: fields.note,
  }
}

const ENTRY_FIELD_LABELS: Readonly<Record<string, string>> = {
  date: 'Date',
  kind: 'Type',
  label: 'Libellé',
  amount: 'Montant',
  category: 'Catégorie',
  payment_method: 'Moyen de paiement',
  advanced_by: 'Avancé par',
  reimbursement_method: 'Moyen de remboursement',
  event: 'Événement',
  supplier: 'Fournisseur',
  note: 'Note',
  file: 'Justificatif',
}

/** The name of a field of a line, for an error its form cannot show under it. */
export function entryFieldLabel(path: string): string {
  return ENTRY_FIELD_LABELS[path] ?? path
}

/** What the column « Justificatif » tells of a line, read aloud. */
export const RECEIPT_STATE_LABELS: Readonly<Record<LedgerReceiptState, string>> = {
  attached: 'Justificatif joint',
  missing: 'Justificatif manquant',
  not_required: 'Justificatif sans objet',
}

/** « courses buvette »: a label within a sentence, its capital lowered, unless it opens an acronym. */
export function inSentence(label: string): string {
  return /^\p{Lu}\p{Ll}/u.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label
}

/** A message to write from the member's own mail client (A3): to, subject and text filled in. */
export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** What a line brings in, or takes out with a minus: the API writes amounts above zero. */
export function signedAmount(entry: Pick<LedgerEntryOut, 'kind' | 'amount'>): number {
  return entry.kind === 'expense' ? -Number(entry.amount) : Number(entry.amount)
}

/** « Avancé par Marc D. », or the payment method of the line. */
export function paymentText(entry: Pick<LedgerEntryOut, 'payment_method' | 'advanced_by'>): string {
  if (entry.payment_method !== 'advance') return PAYMENT_METHOD_LABELS[entry.payment_method]
  return entry.advanced_by ? `Avancé par ${memberShortName(entry.advanced_by)}` : 'Avancé par un ancien membre'
}

/** The lines a journal keeps: all, those of an event, or those without one. */
export type LedgerFilter = number | 'general' | null

/**
 * The lines the bell lists, every year's in place of a fiscal year's: those
 * whose receipt is missing, and the advances the committee owes.
 */
export type PendingLines = 'receipts' | 'advances'

/** What a list of pending lines is called, and what it says when it has none: the journal's, the report's. */
export const PENDING_LINES_TEXTS: Readonly<Record<PendingLines, { title: string, empty: string }>> = {
  receipts: { title: 'Justificatifs manquants', empty: 'Tous les justificatifs sont joints.' },
  advances: { title: 'Avances à rembourser', empty: 'Aucune avance à rembourser.' },
}

/** What the address of the treasury holds: the fiscal year, the filter, the page. */
export interface TreasuryQuery {
  /** None: the current year. */
  year: number | null
  filter: LedgerFilter
  page: number
  /** Every year's pending lines, in place of a fiscal year's. */
  pending?: PendingLines | null
}

// The word of the address for the lines without an event: `?evenement=aucun`.
const GENERAL = 'aucun'

// The words of the address for the pending lines: `?justificatif=manquant`,
// `?avance=a-rembourser`.
const MISSING = 'manquant'
const TO_REIMBURSE = 'a-rembourser'

/** The lines without an event, as the journal names them. */
export const GENERAL_LABEL = 'Hors événement'

/** The fiscal year, filter and page of the address. */
export function parseTreasuryQuery(query: LocationQuery): TreasuryQuery {
  const event = query.evenement
  return {
    year: queryId(query.exercice),
    filter: event === GENERAL ? 'general' : queryId(event),
    page: queryId(query.page) ?? 1,
    pending: query.justificatif === MISSING ? 'receipts' : query.avance === TO_REIMBURSE ? 'advances' : null,
  }
}

/** The fiscal year of the address, or the current one in Paris. */
export function shownYear(query: TreasuryQuery, now: number): number {
  return query.year ?? parisCalendar(now).year
}

/**
 * The span of a fiscal year's figures: a past one runs to its end, the current
 * one until today, as `current` tells it (« Arrêté au 16/10/2026 » on the report).
 */
export function yearSpan(year: number, now: number, current = 'Depuis le 1er janvier'): string {
  return year === parisCalendar(now).year ? current : `Du 1er janvier au 31 décembre ${year}`
}

/** The address of a fiscal year, filter and page: the defaults are left out. */
export function treasuryQuery({ year, filter, page, pending = null }: TreasuryQuery): LocationQueryRaw {
  return {
    exercice: year === null ? undefined : String(year),
    evenement: filter === null ? undefined : filter === 'general' ? GENERAL : String(filter),
    page: page > 1 ? String(page) : undefined,
    justificatif: pending === 'receipts' ? MISSING : undefined,
    avance: pending === 'advances' ? TO_REIMBURSE : undefined,
  }
}

/** A page of the treasury for a fiscal year, a filter and a page, the defaults left out. */
export function ledgerLocation(path: string, query: TreasuryQuery): RouteLocationRaw {
  return { path, query: treasuryQuery(query) }
}

/** Every year's pending lines, as the bell leads to them. */
export function pendingLinesLocation(pending: PendingLines): RouteLocationRaw {
  return ledgerLocation(LEDGER_PATH, { year: null, filter: null, page: 1, pending })
}

/** The page shown, with another filter, from its first lines. */
export function filterLocation(query: TreasuryQuery, filter: LedgerFilter): RouteLocationRaw {
  return { query: treasuryQuery({ year: query.year, filter, page: 1 }) }
}

/** The page shown, for another fiscal year, without filter. */
export function yearLocation(year: number): RouteLocationRaw {
  return { query: treasuryQuery({ year, filter: null, page: 1 }) }
}

/**
 * The query of the journal's API: the year, and an event or the lines without
 * one; or every year's pending lines.
 */
export function ledgerFilters(
  year: number,
  filter: LedgerFilter,
  pending: PendingLines | null = null,
): Omit<LedgerQuery, 'page' | 'page_size'> {
  if (pending === 'receipts') return { receipt_state: 'missing' }
  if (pending === 'advances') return { to_reimburse: true }
  if (filter === 'general') return { year, general: true }
  return filter === null ? { year } : { year, event: filter }
}
