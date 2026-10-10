import { describe, expect, it } from 'vitest'
import { boardDocument, extracted } from '../helpers/documents'
import { julie } from '../helpers/events'

describe('parseDocumentsQuery', () => {
  it('reads the document, category, status, search and page of an address', () => {
    expect(parseDocumentsQuery({ document: '12', categorie: 'comptes-rendus', statut: 'a-verifier', recherche: 'sono', page: '2' })).toEqual({
      document: 12, category: 'minutes', toReview: true, search: 'sono', page: 2,
    })
  })

  it('leaves out what the page does not know', () => {
    /**
     * Given an address with an unknown category, status, a document and a page that are not numbers
     * Then the page shows every document, from the first page, without a panel
     */
    expect(parseDocumentsQuery({ document: 'x', categorie: 'budget', statut: 'valide', page: '-1' })).toEqual({
      document: null, category: null, toReview: false, search: '', page: 1,
    })
  })

  it('writes back the address it reads, the defaults left out', () => {
    const query = { document: 12, category: 'invoice' as const, toReview: false, search: 'sono', page: 1 }

    expect(documentsQuery(query)).toEqual({ document: '12', categorie: 'factures', statut: undefined, recherche: 'sono', page: undefined })
    expect(parseDocumentsQuery(documentsQuery({ ...query, toReview: true, page: 3 }) as Record<string, string>)).toEqual({ ...query, toReview: true, page: 3 })
  })
})

describe('categoryCounts', () => {
  it('names the categories that count some, in the singular or the plural', () => {
    expect(categoryCounts({ total: 4, invoice: 2, order: 1, minutes: 1, misc: 0 })).toBe('2 factures, 1 commande, 1 compte rendu')
    expect(categoryCounts({ total: 2, invoice: 0, order: 0, minutes: 0, misc: 2 })).toBe('2 documents divers')
  })
})

describe('validationText', () => {
  it('agrees with the document, and names who validated it', () => {
    /**
     * Given an invoice validated by Julie, minutes that created two tasks, and any other paper
     * Then each says who validated it, with the agreement of the mockup
     */
    expect(validationText(boardDocument({ status: 'validated', validated_by: julie }))).toBe('Validée par Julie R.')
    expect(validationText(boardDocument({
      category: 'minutes',
      status: 'validated',
      validated_by: julie,
      extracted: extracted({ tasks: [{ title: 'Valider le devis', assignee: null }, { title: 'Relancer', assignee: null }] }),
    }))).toBe('Validé par Julie R. · 2 tâches créées')
    expect(validationText(boardDocument({ category: 'misc', status: 'validated', validated_by: null }))).toBe('Validé par un ancien membre')
  })

  it('tells a document taken over from the v1', () => {
    expect(validationText(boardDocument({ status: 'validated', source: 'v1_import', validated_by: null }))).toBe('Validée · repris de l’ancien site')
  })
})

describe('validationAction', () => {
  it('validates an invoice, an order, or any other paper alone, and minutes with their tasks', () => {
    const task = { title: 'Valider le devis', assignee: null }

    expect(validationAction(boardDocument())).toBe('Valider la facture')
    expect(validationAction(boardDocument({ category: 'order' }))).toBe('Valider la commande')
    expect(validationAction(boardDocument({ category: 'misc' }))).toBe('Valider le document')
    expect(validationAction(boardDocument({ category: 'minutes', extracted: extracted() }))).toBe('Valider le compte rendu')
    expect(validationAction(boardDocument({ category: 'minutes', extracted: extracted({ tasks: [task] }) }))).toBe('Créer la tâche')
    expect(validationAction(boardDocument({ category: 'minutes', extracted: extracted({ tasks: [task, task, task] }) }))).toBe('Créer les 3 tâches')
  })
})

describe('depositLine', () => {
  it('names the file and who deposited it', () => {
    expect(depositLine(boardDocument())).toBe('facture-sono.pdf · déposé par Julie R.')
    expect(depositLine(boardDocument({ uploaded_by: null }))).toBe('facture-sono.pdf · déposé par un ancien membre')
    expect(depositLine(boardDocument({ source: 'v1_import', uploaded_by: null }))).toBe('facture-sono.pdf · repris de l’ancien site')
  })
})

describe('documentPayload', () => {
  it('sends a document whole, as its form edits it', () => {
    /**
     * Given minutes whose form holds an amount the French way, decisions one a
     * line with an empty one, and a task line left without a title
     * Then the document goes whole: the amount the API's way, the decisions and
     * tasks without their empty lines, and empty dates as none
     */
    const fields = documentFields(boardDocument({ category: 'minutes' }))

    const payload = documentPayload({
      ...fields,
      amount: '1 234,50 €',
      decisions: 'Parcours validé.\n\n Budget : 250 €. ',
      tasks: [{ title: 'Valider le devis', assignee: 5 }, { title: '  ', assignee: null }],
      documentDate: '',
    })

    expect(payload).toMatchObject({
      category: 'minutes',
      amount: '1234.50',
      document_date: null,
      extracted: extracted({
        decisions: ['Parcours validé.', 'Budget : 250 €.'],
        tasks: [{ title: 'Valider le devis', assignee: 5 }],
      }),
    })
  })

  it('reads back the fields of the document it was given', () => {
    const document = boardDocument({ amount: '380.00', due_date: '2026-10-28' })

    expect(documentPayload(documentFields(document))).toMatchObject({ amount: '380.00', due_date: '2026-10-28', title: document.title })
  })
})

describe('amountInput', () => {
  it('reads an amount the French way, and no amount for an empty text', () => {
    expect(amountInput('380,00')).toBe('380.00')
    expect(amountInput('1 260,00 €')).toBe('1260.00')
    expect(amountInput('  ')).toBeNull()
  })
})

describe('documentFieldLabel', () => {
  it('names a field of a document, and a task by its number', () => {
    expect(documentFieldLabel('reference')).toBe('Numéro')
    expect(documentFieldLabel('extracted.tasks.1.assignee')).toBe('Tâche 2')
    expect(documentFieldLabel('unknown')).toBe('unknown')
  })
})

describe('fileSize', () => {
  it('writes the size of a file in kilobytes, or megabytes', () => {
    expect(fileSize(200)).toBe('1 Ko')
    expect(fileSize(123_000)).toBe('120 Ko')
    expect(fileSize(1_258_291)).toBe('1,2 Mo')
  })
})
