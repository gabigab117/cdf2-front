import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventsGeneralForm from '~/components/events/GeneralForm.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent, eventItem, julie, page } from '../../helpers/events'

const EVENT = '/api/board/events/{event_id}'
const alain = { id: 8, first_name: 'Alain', last_name: 'Petit', email: 'alain.petit@example.test' }

function mountForm(event?: ReturnType<typeof boardEvent>) {
  return mountSuspended(EventsGeneralForm, { props: { event }, attachTo: document.body })
}

function optionsOf(form: Awaited<ReturnType<typeof mountForm>>, label: string): string[] {
  const id = form.findAll('label').find(element => element.text().startsWith(label))!.attributes('for')
  return form.get(`select#${id}`).findAll('option').map(option => option.text())
}

describe('EventsGeneralForm', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    // Julie, the lead of the event, has left the board: Alain remains.
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([alain])) })
    mockApi('/api/board/events', {
      handler: () => apiResponse(200, page([eventItem({ id: 3, starts_at: '2025-10-31T14:00:00Z' }), eventItem()])),
    })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  // Registered last, run first: the forms unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('creates an event from its general information, dated in Paris', async () => {
    /**
     * Given the board filling in a new event
     * When it gives a title, a category, a place and a start, then creates it
     * Then the API receives the event, its start with Paris's offset, without
     * any public information yet
     * And the form hands over the event created
     */
    mockApi('/api/board/events', { method: 'POST', handler: () => apiResponse(201, boardEvent()) })
    const sent = recordRequests()
    const form = await mountForm()

    await form.get('input[required]:not([type])').setValue('Halloween des enfants')
    await form.get('select[required]').setValue('children')
    await form.findAll('input[required]:not([type])')[1]!.setValue('Salle des fêtes')
    await form.get('input[type="datetime-local"][required]').setValue('2026-10-31T15:00')
    await form.get('form').trigger('submit')
    await vi.waitFor(() => expect(form.emitted('saved')).toEqual([[boardEvent()]]))

    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      title: 'Halloween des enfants',
      slug: '',
      category: 'children',
      starts_at: '2026-10-31T15:00:00+01:00',
      ends_at: null,
      start_label: '',
      venue_name: 'Salle des fêtes',
      lead: null,
      previous_edition: null,
      published: false,
      summary: '',
      venue_address: '',
      latitude: null,
      longitude: null,
      price_label: '',
      price_detail: '',
      programme: [],
      practical_infos: [],
    })
  })

  it('sends nothing while no category is chosen', async () => {
    const sent = recordRequests()
    const form = await mountForm()

    await form.get('form').trigger('submit')

    expect(sent.filter(request => request.method === 'POST')).toEqual([])
  })

  it('rewrites an event with its general information, the rest as it came', async () => {
    mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(200, boardEvent({ title: 'Halloween' })) }, { event_id: 12 })
    const sent = recordRequests()
    const form = await mountForm(boardEvent())

    await form.get('input[required]:not([type])').setValue('Halloween')
    await form.get('form').trigger('submit')
    await vi.waitFor(() => expect(form.emitted('saved')).toHaveLength(1))

    expect(sent.find(request => request.method === 'PUT')).toMatchObject({
      url: '/api/board/events/12',
      body: {
        title: 'Halloween',
        starts_at: '2026-10-31T15:00:00+01:00',
        ends_at: '2026-10-31T18:30:00+01:00',
        lead: julie.id,
        published: true,
        programme: [
          { time: '15:00:00', title: 'Accueil et maquillage', description: 'Salle des fêtes.' },
          { time: '17:00:00', title: 'Goûter', description: '' },
        ],
      },
    })
  })

  it('keeps among the leads to choose from a lead who has left the board', async () => {
    const form = await mountForm(boardEvent())

    await vi.waitFor(() => expect(optionsOf(form, 'Responsable')).toEqual(['Aucun', 'Alain Petit', 'Julie Roux']))
    expect((form.findAll('select')[1]!.element as HTMLSelectElement).selectedOptions[0]?.text).toBe('Julie Roux')
  })

  it('never offers the event as its own previous edition', async () => {
    const form = await mountForm(boardEvent())

    await vi.waitFor(() => expect(optionsOf(form, 'Édition précédente')).toEqual([
      'Aucune',
      'Halloween des enfants · 31 oct. 2025',
    ]))
  })

  it('shows an address already taken under its field', async () => {
    mockApi('/api/board/events', {
      method: 'POST',
      handler: () => apiResponse(422, {
        detail: [{ type: 'validation_error', loc: ['body', 'slug'], msg: 'Un autre événement utilise déjà cette adresse.' }],
      }),
    })
    const form = await mountForm()
    await form.get('select[required]').setValue('children')

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.text()).toContain('Un autre événement utilise déjà cette adresse.'))
    const address = form.findAll('input').at(-1)!
    expect(address.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(address.element)
  })

  it('shows above the form the errors of no field, and of the fields it does not show', async () => {
    mockApi(EVENT, {
      method: 'PUT',
      handler: () => apiResponse(422, {
        detail: [
          { type: 'validation_error', loc: ['body'], msg: 'La fin de l’événement ne peut pas précéder son début.' },
          { type: 'list_type', loc: ['body', 'payload', 'programme'], msg: 'Saisissez une liste de valeurs.' },
        ],
      }),
    }, { event_id: 12 })
    const form = await mountForm(boardEvent())

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.find('[role="alert"]').exists()).toBe(true))
    expect(form.get('[role="alert"]').findAll('p').map(message => message.text())).toEqual([
      'La fin de l’événement ne peut pas précéder son début.',
      'Au programme : Saisissez une liste de valeurs.',
    ])
  })
})
