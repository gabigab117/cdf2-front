import { File, Receipt, ShoppingCart, StickyNote } from '@lucide/vue'
import type { Component } from 'vue'
import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'
import type { Option } from '~/utils/event-form'

type DocumentCategory = components['schemas']['DocumentCategory']
type DocumentCountsOut = components['schemas']['DocumentCountsOut']
type DocumentIn = components['schemas']['DocumentIn']
type DocumentOut = components['schemas']['DocumentOut']

/** The Documents page, where the board deposits, reviews and finds its documents. */
export const DOCUMENTS_PATH = '/bureau/documents'

/** Where a document is deposited from the « Nouveau » menu, or from an event. */
export const NEW_DOCUMENT_PATH = `${DOCUMENTS_PATH}/nouveau`

/** How many documents a page of a list holds. */
export const DOCUMENTS_PAGE_SIZE = 25

/** The tones a category's pill and icon take (UiStatusPill). */
export type CategoryTone = 'azur' | 'ambre' | 'slate' | 'mist'

interface CategoryLook {
  /** « Facture », on its pill. */
  label: string
  /** « Factures », on its chip. */
  chip: string
  /** « 1 facture », « 2 factures »: how a count names it. */
  one: string
  many: string
  /** The word of the address: `?categorie=factures`. */
  slug: string
  tone: CategoryTone
  icon: Component
}

/** What each category shows, in the order of the chips. */
export const DOCUMENT_CATEGORIES: Readonly<Record<DocumentCategory, CategoryLook>> = {
  invoice: { label: 'Facture', chip: 'Factures', one: 'facture', many: 'factures', slug: 'factures', tone: 'azur', icon: Receipt },
  order: { label: 'Commande', chip: 'Commandes', one: 'commande', many: 'commandes', slug: 'commandes', tone: 'ambre', icon: ShoppingCart },
  minutes: { label: 'Compte rendu', chip: 'Comptes rendus', one: 'compte rendu', many: 'comptes rendus', slug: 'comptes-rendus', tone: 'slate', icon: StickyNote },
  misc: { label: 'Divers', chip: 'Divers', one: 'document divers', many: 'documents divers', slug: 'divers', tone: 'mist', icon: File },
}

// Object.keys() types its keys as strings: they are those of the record.
const CATEGORIES = Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]

/** The categories to choose from, in the order of the chips. */
export const DOCUMENT_CATEGORY_OPTIONS: readonly Option<DocumentCategory>[] = CATEGORIES.map(
  category => ({ value: category, label: DOCUMENT_CATEGORIES[category].label }),
)

/** What a document without an event belongs to, as the mockup names it. */
export const NO_EVENT_LABEL = 'Fonctionnement'

/** What the address of the Documents page holds. */
export interface DocumentsQuery {
  /** The document the panel shows. */
  document: number | null
  category: DocumentCategory | null
  /** The documents awaiting review alone. */
  toReview: boolean
  search: string
  page: number
}

const TO_REVIEW = 'a-verifier'

/**
 * What an address of the Documents page asks for:
 * `?document=12&categorie=factures&statut=a-verifier&recherche=sono&page=2`.
 * A value the page does not know is left out.
 */
export function parseDocumentsQuery(query: LocationQuery): DocumentsQuery {
  const document = Number(query.document)
  const page = Number(query.page)
  return {
    document: Number.isInteger(document) && document > 0 ? document : null,
    category: CATEGORIES.find(category => DOCUMENT_CATEGORIES[category].slug === query.categorie) ?? null,
    toReview: query.statut === TO_REVIEW,
    search: typeof query.recherche === 'string' ? query.recherche : '',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** The address of the Documents page, in the form parseDocumentsQuery() reads. */
export function documentsQuery({ document, category, toReview, search, page }: DocumentsQuery): LocationQueryRaw {
  return {
    document: document === null ? undefined : String(document),
    categorie: category === null ? undefined : DOCUMENT_CATEGORIES[category].slug,
    statut: toReview ? TO_REVIEW : undefined,
    recherche: search || undefined,
    page: page > 1 ? String(page) : undefined,
  }
}

/** The address of a document, its panel open in the Documents page. */
export function documentLocation(id: number): RouteLocationRaw {
  return { path: DOCUMENTS_PATH, query: { document: String(id) } }
}

/** The address of the documents awaiting review. */
export const TO_REVIEW_LOCATION: RouteLocationRaw = { path: DOCUMENTS_PATH, query: { statut: TO_REVIEW } }

/** « 1 facture », « 2 comptes rendus ». */
export function categoryCount(category: DocumentCategory, count: number): string {
  const { one, many } = DOCUMENT_CATEGORIES[category]
  return `${count} ${count > 1 ? many : one}`
}

/** « 2 factures, 1 commande, 1 compte rendu »: the categories that count some. */
export function categoryCounts(counts: DocumentCountsOut): string {
  return CATEGORIES.filter(category => counts[category] > 0)
    .map(category => categoryCount(category, counts[category]))
    .join(', ')
}

// The mockup agrees « validée » with an invoice and an order, « validé » with
// minutes and with any other document.
const FEMININE: ReadonlySet<DocumentCategory> = new Set(['invoice', 'order'])

/** The tasks the minutes list, or none for another document. */
export function listedTasks(document: Pick<DocumentOut, 'category' | 'extracted'>): number {
  return document.category === 'minutes' ? document.extracted.tasks.length : 0
}

/**
 * What a validated document tells: « Validée par Sophie L. », « Validé par
 * Marc D. · 4 tâches créées », or « Validé · repris de l’ancien site ».
 */
export function validationText(document: DocumentOut): string {
  const validated = FEMININE.has(document.category) ? 'Validée' : 'Validé'
  if (document.source === 'v1_import') return `${validated} · repris de l’ancien site`
  const who = document.validated_by ? memberShortName(document.validated_by) : 'un ancien membre'
  const tasks = listedTasks(document)
  const created = tasks > 1 ? ` · ${tasks} tâches créées` : tasks === 1 ? ' · 1 tâche créée' : ''
  return `${validated} par ${who}${created}`
}

/**
 * The action that validates a document awaiting review: the invoice and the
 * order are validated alone until the treasury (phase 6) and the stock
 * (phase 7); minutes create the tasks they list.
 */
export function validationAction(document: Pick<DocumentOut, 'category' | 'extracted'>): string {
  const tasks = listedTasks(document)
  switch (document.category) {
    case 'invoice': return 'Valider la facture'
    case 'order': return 'Valider la commande'
    case 'minutes': return tasks > 1 ? `Créer les ${tasks} tâches` : tasks === 1 ? 'Créer la tâche' : 'Valider le compte rendu'
    case 'misc': return 'Valider le document'
  }
}

/** « facture-sono.pdf · déposé par Gabriel T. », or the file taken over from the v1. */
export function depositLine(document: DocumentOut): string {
  if (document.source === 'v1_import') return `${document.original_name} · repris de l’ancien site`
  const who = document.uploaded_by ? memberShortName(document.uploaded_by) : 'un ancien membre'
  return `${document.original_name} · déposé par ${who}`
}

/** A task the minutes list, as their form edits it. */
export interface ListedTask {
  title: string
  assignee: number | null
}

/**
 * What the « Corriger » form edits. Dates and the amount are texts, empty for
 * none; the decisions, one a line.
 */
export interface DocumentFields {
  category: DocumentCategory
  title: string
  event: number | null
  documentDate: string
  issuer: string
  reference: string
  amount: string
  dueDate: string
  paidOn: string
  note: string
  deliveryDate: string
  items: string
  abstract: string
  decisions: string
  tasks: ListedTask[]
  keyDate: string
}

/** The fields of a document to correct, as the API gave it. */
export function documentFields(document: DocumentOut): DocumentFields {
  const extracted = document.extracted
  return {
    category: document.category,
    title: document.title,
    event: document.event?.id ?? null,
    documentDate: document.document_date ?? '',
    issuer: document.issuer,
    reference: document.reference,
    amount: document.amount === null ? '' : document.amount.replace('.', ','),
    dueDate: document.due_date ?? '',
    paidOn: document.paid_on ?? '',
    note: document.note,
    deliveryDate: extracted.delivery_date ?? '',
    items: extracted.items,
    abstract: extracted.abstract,
    decisions: extracted.decisions.join('\n'),
    tasks: extracted.tasks.map(task => ({ title: task.title, assignee: task.assignee })),
    keyDate: extracted.key_date,
  }
}

/**
 * The amount as the API reads it: « 1 234,50 » becomes "1234.50" (a space of
 * any kind, the non-breaking ones included, is a `\s`). A text that is not a
 * number goes as it is: the API tells what is wrong with it.
 */
export function amountInput(text: string): string | null {
  const amount = text.replace(/[\s€]/g, '').replace(',', '.')
  return amount === '' ? null : amount
}

/** The document to send, whole: empty texts are no date, no amount. */
export function documentPayload(fields: DocumentFields): DocumentIn {
  return {
    category: fields.category,
    title: fields.title,
    event: fields.event,
    document_date: fields.documentDate || null,
    issuer: fields.issuer,
    reference: fields.reference,
    amount: amountInput(fields.amount),
    due_date: fields.dueDate || null,
    paid_on: fields.paidOn || null,
    note: fields.note,
    extracted: {
      delivery_date: fields.deliveryDate || null,
      items: fields.items,
      abstract: fields.abstract,
      decisions: fields.decisions.split('\n').map(line => line.trim()).filter(Boolean),
      // A line left without a title is no task.
      tasks: fields.tasks.filter(task => task.title.trim() !== ''),
      key_date: fields.keyDate,
    },
  }
}

const DOCUMENT_FIELD_LABELS: Readonly<Record<string, string>> = {
  'file': 'Fichier',
  'category': 'Catégorie',
  'title': 'Titre',
  'event': 'Événement',
  'document_date': 'Date',
  'issuer': 'Émetteur',
  'reference': 'Numéro',
  'amount': 'Montant',
  'due_date': 'Échéance',
  'paid_on': 'Payée le',
  'note': 'Remarque',
  'extracted.delivery_date': 'Livraison prévue',
  'extracted.items': 'Articles',
  'extracted.abstract': 'Résumé',
  'extracted.decisions': 'Décisions',
  'extracted.key_date': 'Date repérée',
}

/**
 * The name of a field of a document, for an error the form cannot show under
 * it: « Tâche 2 : … » for a field of a listed task.
 */
export function documentFieldLabel(path: string): string {
  const task = /^extracted\.tasks\.(\d+)/.exec(path)
  if (task) return `Tâche ${Number(task[1]) + 1}`
  return DOCUMENT_FIELD_LABELS[path] ?? path
}
