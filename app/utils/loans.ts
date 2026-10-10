import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type LoanBorrowerType = components['schemas']['LoanBorrowerType']
type LoanIn = components['schemas']['LoanIn']
type LoanOut = components['schemas']['LoanOut']

/** The Prêts page: the planning, the loans and the panel of one. */
export const LOANS_PATH = '/bureau/prets'

/** Where a loan is recorded, from the « Nouveau » menu, the inventory or an event. */
export const NEW_LOAN_PATH = `${LOANS_PATH}/nouveau`

/** The page of a loan's form. */
export function editLoanPath(id: number): string {
  return `${LOANS_PATH}/${id}/modifier`
}

/** The id an address names, such as `?materiel=12`, or none. */
export function queryId(value: unknown): number | null {
  const id = Number(value)
  return typeof value === 'string' && Number.isInteger(id) && id > 0 ? id : null
}

/** The address of a loan, its panel open beside the list. */
export function loanLocation(id: number): RouteLocationRaw {
  return { path: LOANS_PATH, query: { pret: String(id) } }
}

interface BorrowerLook {
  /** « Association », on its chip. */
  label: string
  /** What the name of the borrower is called: « Nom de l’association ». */
  nameLabel: string
}

/** What each type of borrower shows, in the order of the form's chips. */
export const BORROWER_TYPES: Readonly<Record<LoanBorrowerType, BorrowerLook>> = {
  association: { label: 'Association', nameLabel: 'Nom de l’association' },
  individual: { label: 'Particulier', nameLabel: 'Nom et prénom' },
  municipality: { label: 'Commune', nameLabel: 'Service ou commune' },
  committee: { label: 'Usage comité', nameLabel: 'Événement du comité' },
}

// Object.keys() types its keys as strings: they are those of the record.
export const BORROWER_TYPE_VALUES = Object.keys(BORROWER_TYPES) as LoanBorrowerType[]

/**
 * What the loan form edits. The deposit is a text, as its field holds it; the
 * quantities go by equipment, the equipment left out taking none.
 */
export interface LoanFields {
  borrowerType: LoanBorrowerType
  borrowerName: string
  purpose: string
  phone: string
  event: number | null
  startDate: string
  endDate: string
  deposit: string
  notes: string
  quantities: Record<number, number>
}

/** A deposit as its field shows it: « 150,00 ». */
export function depositText(amount: string): string {
  return amount.replace('.', ',')
}

/** The fields of a new loan, from a day: an association's, without equipment. */
export function newLoanFields(day: string): LoanFields {
  return {
    borrowerType: 'association',
    borrowerName: '',
    purpose: '',
    phone: '',
    event: null,
    startDate: day,
    endDate: day,
    deposit: '',
    notes: '',
    quantities: {},
  }
}

/** The fields of a loan to change, as the API gave it. */
export function loanFields(loan: LoanOut): LoanFields {
  return {
    borrowerType: loan.borrower_type,
    borrowerName: loan.borrower_name,
    purpose: loan.purpose,
    phone: loan.phone,
    event: loan.event?.id ?? null,
    startDate: loan.start_date,
    endDate: loan.end_date,
    deposit: depositText(loan.deposit_amount),
    notes: loan.notes,
    quantities: Object.fromEntries(loan.lines.map(line => [line.equipment.id, line.quantity])),
  }
}

/** The quantities of a loan with one changed: an equipment of none leaves it. */
export function withQuantity(quantities: Readonly<Record<number, number>>, id: number, quantity: number): Record<number, number> {
  const others = Object.entries(quantities).filter(([equipment]) => Number(equipment) !== id)
  return Object.fromEntries(quantity > 0 ? [...others, [id, quantity]] : others)
}

/**
 * The equipment a loan takes, as its lines are sent: the ids of `order` first,
 * in its order, the inventory's.
 */
export function loanLines(fields: LoanFields, order: readonly number[]): Array<{ equipment: number, quantity: number }> {
  const chosen = Object.entries(fields.quantities)
    .map(([equipment, quantity]) => ({ equipment: Number(equipment), quantity }))
    .filter(line => line.quantity > 0)
  const place = (id: number) => (order.includes(id) ? order.indexOf(id) : order.length)
  return chosen.sort((first, second) => place(first.equipment) - place(second.equipment))
}

/** The loan to send, whole: an empty deposit is the type's own. */
export function loanPayload(fields: LoanFields, order: readonly number[]): LoanIn {
  return {
    borrower_type: fields.borrowerType,
    borrower_name: fields.borrowerName,
    purpose: fields.purpose,
    phone: fields.phone,
    event: fields.event,
    start_date: fields.startDate,
    end_date: fields.endDate,
    deposit_amount: amountInput(fields.deposit),
    notes: fields.notes,
    lines: loanLines(fields, order),
  }
}

/** How many days a loan lasts, both counted: none when it ends before it starts. */
export function loanDays(start: string, end: string): number {
  return Math.max(dayNumber(end) - dayNumber(start) + 1, 0)
}

/** « 3 jours », « 1 jour ». */
export function daysText(days: number): string {
  return `${days} ${days > 1 ? 'jours' : 'jour'}`
}

const LOAN_FIELD_LABELS: Readonly<Record<string, string>> = {
  borrower_type: 'Type d’emprunteur',
  borrower_name: 'Emprunteur',
  purpose: 'Objet du prêt',
  phone: 'Téléphone',
  event: 'Événement',
  start_date: 'Sortie du matériel',
  end_date: 'Retour',
  deposit_amount: 'Caution',
  notes: 'Remarques',
}

/**
 * The name of a field of a loan, for an error the form cannot show under it:
 * a line's, after its equipment.
 */
export function loanFieldLabel(path: string, names: readonly string[] = []): string {
  const line = /^lines\.(\d+)/.exec(path)
  if (line) return names[Number(line[1])] ?? 'Matériel'
  return LOAN_FIELD_LABELS[path] ?? path
}
