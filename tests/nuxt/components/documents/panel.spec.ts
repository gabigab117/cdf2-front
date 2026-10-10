import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsPanel from '~/components/documents/Panel.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardDocument, extracted } from '../../helpers/documents'
import { eventItem, julie, page } from '../../helpers/events'

type DocumentOut = components['schemas']['DocumentOut']

const DOCUMENT = '/api/board/documents/{document_id}'

function readable(text: string): string {
  return text.replaceAll(' ', ' ').replaceAll(' ', ' ')
}

// The reading of the document answers GET alone: a mock without a method would
// answer the writes on the same address, being the latest registered.
function mockDocument(shown: DocumentOut) {
  mockApi(DOCUMENT, { method: 'GET', handler: () => apiResponse(200, shown) }, { document_id: shown.id })
}

async function mountPanel(shown: DocumentOut, startEditing = false) {
  mockDocument(shown)
  const panel = await mountSuspended(DocumentsPanel, { props: { id: shown.id, startEditing }, attachTo: document.body })
  await vi.waitFor(() => expect(panel.find('h2').exists()).toBe(true))
  return panel
}

/** The rows of the panel's details: « label value ». */
function rows(panel: Awaited<ReturnType<typeof mountPanel>>) {
  return panel.findAll('dl > div').map(row => readable(`${row.get('dt').text()} ${row.get('dd').text()}`))
}

function button(panel: Awaited<ReturnType<typeof mountPanel>>, text: string) {
  return panel.findAll('button').find(candidate => candidate.text().includes(text))!
}

describe('the panel of a document', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows an invoice to review, the rows of the mockup and its validation', async () => {
    /**
     * Given an invoice of Halloween awaiting review
     * Then the panel names its category, file and who deposited it, asks to
     * check it, shows its supplier, number, dates, event and amount, and offers
     * to validate it, or to correct it
     */
    const panel = await mountPanel(boardDocument())

    expect(panel.get('h2').text()).toBe('Facture — Location sono')
    expect(panel.text()).toContain('facture-sono.pdf · déposé par Julie R.')
    expect(panel.text()).toContain('Complétez et vérifiez les informations avant de valider.')
    expect(rows(panel)).toEqual([
      'Fournisseur Animation 60',
      'N° de facture F-2026-0418',
      'Date 28 sept.',
      'Échéance 28 oct.',
      'Événement Halloween des enfants',
      'Montant TTC 380,00 €',
    ])
    expect(button(panel, 'Valider la facture').exists()).toBe(true)
    expect(button(panel, 'Corriger').exists()).toBe(true)
  })

  it('tells the day an invoice was paid in place of its due date', async () => {
    const panel = await mountPanel(boardDocument({ paid_on: '2026-09-29' }))

    expect(rows(panel)).toContain('Échéance Payée le 29 sept.')
  })

  it('shows an order: its delivery, items and amount', async () => {
    const panel = await mountPanel(boardDocument({
      category: 'order',
      title: 'Bon de commande — Bonbons',
      reference: '',
      extracted: extracted({ delivery_date: '2026-10-27', items: 'Bonbons assortis 12 kg, gobelets' }),
    }))

    expect(rows(panel)).toEqual([
      'Fournisseur Animation 60',
      'Commandé le 28 sept.',
      'Livraison prévue 27 oct.',
      'Événement Halloween des enfants',
      'Articles Bonbons assortis 12 kg, gobelets',
      'Montant 380,00 €',
    ])
    expect(button(panel, 'Valider la commande').exists()).toBe(true)
  })

  it('shows minutes: their abstract, decisions and the tasks to create', async () => {
    /**
     * Given minutes listing two decisions and two tasks, one for Julie
     * Then the panel shows them, the tasks with whom they are for, and offers
     * to create them
     */
    const panel = await mountPanel(boardDocument({
      category: 'minutes',
      issuer: '',
      amount: null,
      extracted: extracted({
        abstract: 'Réunion consacrée à Halloween.',
        decisions: ['Parcours validé.', 'Budget bonbons : 250 €.'],
        tasks: [{ title: 'Valider le devis sono', assignee: julie.id }, { title: 'Trouver 2 bénévoles', assignee: null }],
      }),
    }))

    await vi.waitFor(() => expect(panel.text()).toContain('Julie'))
    expect(panel.text()).toContain('Réunion consacrée à Halloween.')
    expect(panel.findAll('ul')[0]!.findAll('li').map(item => item.text())).toEqual(['Parcours validé.', 'Budget bonbons : 250 €.'])
    expect(panel.text()).toContain('Tâches à créer (2)')
    expect(button(panel, 'Créer les 2 tâches').exists()).toBe(true)
    expect(rows(panel)).toEqual(['Date 28 sept.', 'Événement Halloween des enfants'])
  })

  it('shows any other paper: its abstract, its key date, and a remark taken over', async () => {
    /**
     * Given a paper without event, of the v1, with an issuer and a remark
     * Then the panel shows its key date, « Fonctionnement » for its event, its
     * issuer, and its remark
     */
    const panel = await mountPanel(boardDocument({
      category: 'misc',
      source: 'v1_import',
      status: 'validated',
      validated_at: '2026-10-10T08:00:00Z',
      uploaded_by: null,
      event: null,
      document_date: null,
      reference: '',
      amount: null,
      note: 'Type d’origine : Courrier.',
      extracted: extracted({ abstract: 'Autorise le défilé.', key_date: '31 oct. · 15 h 30' }),
    }))

    expect(rows(panel)).toEqual(['Date repérée 31 oct. · 15 h 30', 'Événement Fonctionnement', 'Émetteur Animation 60'])
    expect(panel.text()).toContain('Autorise le défilé.')
    expect(panel.text()).toContain('Type d’origine : Courrier.')
    expect(panel.text()).toContain('Validé · repris de l’ancien site')
  })

  it('tells who validated a document, and leaves it to correct only', async () => {
    const panel = await mountPanel(boardDocument({ status: 'validated', validated_by: julie, validated_at: '2026-09-29T10:00:00Z' }))

    expect(panel.text()).toContain('Validée par Julie R.')
    expect(panel.text()).not.toContain('Valider la facture')
    expect(button(panel, 'Corriger').exists()).toBe(true)
  })

  it('validates a document, which then tells who validated it', async () => {
    mockApi(`${DOCUMENT}/validate` as '/api/board/documents/{document_id}/validate', {
      method: 'POST',
      handler: () => apiResponse(200, boardDocument({ status: 'validated', validated_by: julie, validated_at: '2026-10-01T08:00:00Z' })),
    }, { document_id: 21 })
    const panel = await mountPanel(boardDocument())

    await button(panel, 'Valider la facture').trigger('click')

    await vi.waitFor(() => expect(panel.text()).toContain('Validée par Julie R.'))
    expect(panel.emitted('changed')).toHaveLength(1)
  })

  it('tells why minutes could not be validated, a task by its number', async () => {
    mockApi('/api/board/documents/{document_id}/validate', {
      method: 'POST',
      handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'extracted', 'tasks', 1, 'assignee'], msg: 'Choisissez un membre du bureau.' },
      ] }),
    }, { document_id: 21 })
    const panel = await mountPanel(boardDocument({
      category: 'minutes',
      extracted: extracted({ tasks: [{ title: 'A', assignee: null }, { title: 'B', assignee: 99 }] }),
    }))

    await button(panel, 'Créer les 2 tâches').trigger('click')

    await vi.waitFor(() => expect(panel.get('[role="alert"]').text()).toBe('Tâche 2 : Choisissez un membre du bureau.'))
    expect(panel.emitted('changed')).toBeUndefined()
  })

  it('corrects a document whole, then shows it as it now stands', async () => {
    /**
     * Given an invoice to review
     * When the member corrects its amount, the French way
     * Then the API receives the invoice whole, the amount its way
     * And the panel shows the document the API gave back
     */
    mockApi(DOCUMENT, {
      method: 'PUT',
      handler: () => apiResponse(200, boardDocument({ amount: '395.50' })),
    }, { document_id: 21 })
    const sent = recordRequests()
    const panel = await mountPanel(boardDocument())

    await button(panel, 'Corriger').trigger('click')
    const amount = panel.findAll('input').find(input => input.attributes('inputmode') === 'decimal')!
    await amount.setValue('395,50')
    await panel.get('form').trigger('submit')

    await vi.waitFor(() => expect(readable(panel.text())).toContain('395,50 €'))
    expect(sent.find(request => request.method === 'PUT')?.body).toMatchObject({
      category: 'invoice', title: 'Facture — Location sono', amount: '395.50', event: 12,
    })
    expect(panel.find('form').exists()).toBe(false)
    expect(panel.emitted('changed')).toHaveLength(1)
  })

  it('opens on its form the document just deposited, and shows the fields of its category', async () => {
    /**
     * Given minutes just deposited
     * Then the panel opens on their form: abstract, decisions, tasks, and no
     * amount nor supplier
     */
    const panel = await mountPanel(boardDocument({ category: 'minutes' }), true)

    expect(panel.find('form').exists()).toBe(true)
    const labels = panel.findAll('label').map(label => label.text())
    expect(labels).toEqual(expect.arrayContaining(['Résumé (facultatif)', 'Décisions (facultatif)']))
    expect(labels.join()).not.toContain('Montant')
    expect(panel.text()).toContain('Ajouter une tâche')
  })

  it('deletes a document once the member confirms', async () => {
    mockApi(DOCUMENT, { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { document_id: 21 })
    const panel = await mountPanel(boardDocument(), true)

    await button(panel, 'Supprimer').trigger('click')
    expect(panel.text()).toContain('Supprimer le document « Facture — Location sono » et son fichier ?')
    await button(panel, 'Supprimer définitivement').trigger('click')

    await vi.waitFor(() => expect(panel.emitted('deleted')).toHaveLength(1))
  })

  it('downloads the file under the name it was deposited with', async () => {
    mockApi('/api/board/documents/{document_id}/file', {
      handler: () => new Response(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { headers: { 'Content-Type': 'application/pdf' } }),
    }, { document_id: 21 })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost:3000/file')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const downloads: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
    const panel = await mountPanel(boardDocument())

    await button(panel, 'Télécharger').trigger('click')

    await vi.waitFor(() => expect(downloads).toEqual(['facture-sono.pdf']))
  })

  it('tells why the file could not be read', async () => {
    mockApi('/api/board/documents/{document_id}/file', { handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { document_id: 21 })
    vi.spyOn(window, 'open').mockReturnValue(null)
    const panel = await mountPanel(boardDocument())

    await button(panel, 'Ouvrir l’original').trigger('click')

    await vi.waitFor(() => expect(panel.get('[role="alert"]').text()).toBe('Introuvable.'))
  })

  it('closes on demand', async () => {
    const panel = await mountPanel(boardDocument())

    await panel.get('button[aria-label="Fermer le panneau"]').trigger('click')

    expect(panel.emitted('close')).toHaveLength(1)
  })

  it('says why the document could not load, and loads it again on demand', async () => {
    const handler = vi.fn(() => apiResponse(500, 'Internal Server Error'))
    mockApi(DOCUMENT, { method: 'GET', handler }, { document_id: 21 })
    const panel = await mountSuspended(DocumentsPanel, { props: { id: 21 } })

    await vi.waitFor(() => expect(panel.text()).toContain('Le service est momentanément indisponible.'))
    handler.mockImplementation(() => apiResponse(200, boardDocument()))
    await panel.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(panel.find('h2').exists()).toBe(true))
  })
})
