import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventsPublicInfoForm from '~/components/events/PublicInfoForm.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent, page } from '../../helpers/events'

const EVENT = '/api/board/events/{event_id}'

function mountForm(event = boardEvent()) {
  return mountSuspended(EventsPublicInfoForm, { props: { event }, attachTo: document.body })
}

function refuse(detail: unknown[]) {
  mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(422, { detail }) }, { event_id: 12 })
}

describe('EventsPublicInfoForm', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  // Registered last, run first: the forms unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('writes the event back whole: its public information as edited, the rest as it came', async () => {
    /**
     * Given an event the board edits in its « Infos publiques » tab
     * When it changes the summary and the latitude, moves the second programme
     * line up, takes the « Bon à savoir » away, then saves
     * Then the API receives the whole event: the general information exactly
     * as it came, the public information as edited
     */
    mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })
    const sent = recordRequests()
    const form = await mountForm()

    await form.get('textarea').setValue('Défilé, puis goûter.')
    await form.get('input[inputmode="decimal"]').setValue('49,4183')
    await form.get('button[aria-label="Monter : ligne 2"]').trigger('click')
    await form.findAll('button[aria-label="Retirer : ligne 1"]')[1]!.trigger('click')
    await form.get('form').trigger('submit')
    await vi.waitFor(() => expect(sent.filter(request => request.method === 'PUT')).toHaveLength(1))

    expect(sent.find(request => request.method === 'PUT')).toEqual({
      method: 'PUT',
      url: '/api/board/events/12',
      body: {
        title: 'Halloween des enfants',
        slug: 'halloween-des-enfants-2026',
        category: 'children',
        starts_at: '2026-10-31T14:00:00Z',
        ends_at: '2026-10-31T17:30:00Z',
        start_label: '',
        venue_name: 'Salle des fêtes',
        lead: 7,
        previous_edition: null,
        published: true,
        summary: 'Défilé, puis goûter.',
        venue_address: '1 place de la Mairie',
        latitude: 49.4183,
        longitude: 1.98,
        price_label: 'Gratuit',
        price_detail: 'Goûter offert par le comité',
        programme: [
          { time: '17:00', title: 'Goûter', description: '' },
          { time: '15:00', title: 'Accueil et maquillage', description: 'Salle des fêtes.' },
        ],
        practical_infos: [],
      },
    })
  })

  it('says the changes are saved, and shows the event as the API saved it', async () => {
    mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(200, boardEvent({ latitude: 49.4183 })) }, { event_id: 12 })
    const form = await mountForm()

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.get('[role="status"]').text()).toBe('Modifications enregistrées.'))
    expect((form.get('input[inputmode="decimal"]').element as HTMLInputElement).value).toBe('49,4183')
    expect(form.emitted('saved')).toEqual([[boardEvent({ latitude: 49.4183 })]])
  })

  it('shows the error of a line under its field', async () => {
    refuse([{ type: 'validation_error', loc: ['body', 'programme', 1, 'title'], msg: 'Ce champ ne peut pas être vide.' }])
    const form = await mountForm()

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.text()).toContain('Ce champ ne peut pas être vide.'))
    const secondLine = form.findAll('li')[1]!
    expect(secondLine.get('input[required]:not([type="time"])').attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(secondLine.get('input[aria-invalid="true"]').element)
  })

  it('moves to the form the errors of the fields it does not show, after their name', async () => {
    /**
     * Given an error about the event's title, which the tab does not show,
     * and an error about the coordinates as a whole
     * Then both show above the form, the first after the name of its field
     */
    refuse([
      { type: 'validation_error', loc: ['body', 'title'], msg: 'Ce champ ne peut pas être vide.' },
      { type: 'validation_error', loc: ['body'], msg: 'Indiquez la latitude et la longitude, ou aucune des deux.' },
    ])
    const form = await mountForm()

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.find('[role="alert"]').exists()).toBe(true))
    const alert = form.get('[role="alert"]')
    expect(alert.text()).toContain('Indiquez la latitude et la longitude, ou aucune des deux.')
    expect(alert.text()).toContain('Titre : Ce champ ne peut pas être vide.')
    expect(document.activeElement).toBe(alert.element)
  })

  it('forgets the errors of the lines once they move', async () => {
    /**
     * Given an error under the title of the second programme line
     * When the lines move
     * Then the error is no longer shown, as it would point at another line
     */
    refuse([{ type: 'validation_error', loc: ['body', 'programme', 1, 'title'], msg: 'Ce champ ne peut pas être vide.' }])
    const form = await mountForm()
    await form.get('form').trigger('submit')
    await vi.waitFor(() => expect(form.text()).toContain('Ce champ ne peut pas être vide.'))

    await form.get('button[aria-label="Monter : ligne 2"]').trigger('click')

    expect(form.text()).not.toContain('Ce champ ne peut pas être vide.')
  })

  it('adds a blank line at the end of the programme', async () => {
    const form = await mountForm()

    await form.findAll('button').find(button => button.text() === 'Ajouter une ligne')!.trigger('click')

    const lines = form.findAll('ol')[0]!.findAll(':scope > li')
    expect(lines).toHaveLength(3)
    expect((lines[2]!.get('input[type="time"]').element as HTMLInputElement).value).toBe('')
  })
})
