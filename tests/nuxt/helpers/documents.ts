import type { components } from '~/types/api'
import { julie } from './events'

type DocumentOut = components['schemas']['DocumentOut']
type DocumentItemOut = components['schemas']['DocumentItemOut']
type DocumentExtractedOut = components['schemas']['DocumentExtractedOut']

/** The extracted data of a document, every key empty unless given. */
export function extracted(changes: Partial<DocumentExtractedOut> = {}): DocumentExtractedOut {
  return { delivery_date: null, items: '', abstract: '', decisions: [], tasks: [], key_date: '', ...changes }
}

/** A fictitious invoice of Halloween, deposited by Julie, awaiting review. */
export function boardDocument(changes: Partial<DocumentOut> = {}): DocumentOut {
  return {
    id: 21,
    title: 'Facture — Location sono',
    category: 'invoice',
    status: 'to_review',
    source: 'upload',
    original_name: 'facture-sono.pdf',
    mime_type: 'application/pdf',
    size: 120_000,
    document_date: '2026-09-28',
    date: '2026-09-28',
    issuer: 'Animation 60',
    reference: 'F-2026-0418',
    amount: '380.00',
    due_date: '2026-10-28',
    paid_on: null,
    event: { id: 12, title: 'Halloween des enfants' },
    extracted: extracted(),
    note: '',
    uploaded_by: julie,
    validated_by: null,
    validated_at: null,
    created_at: '2026-09-28T08:00:00Z',
    ...changes,
  }
}

/** The row of a document in a list. */
export function documentItem(changes: Partial<DocumentItemOut> = {}): DocumentItemOut {
  return {
    id: 21,
    title: 'Facture — Location sono',
    category: 'invoice',
    status: 'to_review',
    event: { id: 12, title: 'Halloween des enfants' },
    amount: '380.00',
    date: '2026-09-28',
    ...changes,
  }
}
