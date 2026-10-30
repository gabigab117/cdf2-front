import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosAlbumForm from '~/components/photos/AlbumForm.vue'
import PhotosAlbumHeader from '~/components/photos/AlbumHeader.vue'
import { button } from '../../helpers/form'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { eventItem, page } from '../../helpers/events'
import { boardAlbum } from '../../helpers/photos'

const PUBLISHED = '/api/board/albums/{album_id}/published'

beforeEach(() => {
  useSessionStore().accessToken = 'access-1'
  useNow().value = Date.parse('2026-10-01T10:00:00Z')
  mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem({ id: 12, title: 'Brocante', starts_at: '2026-09-13T06:00:00Z' })])) })
})

afterEach(() => {
  clearApiMocks()
  clearNuxtData()
  vi.restoreAllMocks()
  useSessionStore().clear()
})

// Registered last, run first: the components unmount before the data is cleared.
enableAutoUnmount(afterEach)

describe('the head of an album', () => {
  function mountHeader(album = boardAlbum({ published: false, photos_count: 128, contributors_count: 3 })) {
    return mountSuspended(PhotosAlbumHeader, { props: { album }, attachTo: document.body })
  }

  it('says its day, its photos and the members who added them', async () => {
    const header = await mountHeader()

    expect(header.get('h1').text()).toBe('Brocante 2026')
    expect(header.get('p').text()).toBe('Dimanche 13 septembre · 128 photos · ajoutées par 3 membres')
    expect(header.get<HTMLInputElement>('input[role="switch"]').element.checked).toBe(false)
  })

  it('publishes the album with its switch, the explicit gesture of D17', async () => {
    mockApi(PUBLISHED, { method: 'PUT', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    const sent = recordRequests()
    const header = await mountHeader()

    await header.get('input[role="switch"]').setValue(true)

    await vi.waitFor(() => expect(header.emitted('changed')).toHaveLength(1))
    expect(sent).toEqual([{ method: 'PUT', url: '/api/board/albums/5/published', body: { published: true } }])
  })

  it('puts its switch back when the publication is refused', async () => {
    mockApi(PUBLISHED, { method: 'PUT', handler: () => apiResponse(500, {}) }, { album_id: 5 })
    const header = await mountHeader()
    const toggle = header.get<HTMLInputElement>('input[role="switch"]')

    await toggle.setValue(true)

    await vi.waitFor(() => expect(header.find('[role="alert"]').exists()).toBe(true))
    expect(toggle.element.checked).toBe(false)
    expect(header.emitted('changed')).toBeUndefined()
  })

  it('asks for its form and for photos', async () => {
    const header = await mountHeader()

    await header.get('button:not([role])').trigger('click')
    const add = button(header, 'Ajouter des photos')
    await add?.trigger('click')

    expect(header.emitted('edit')).toHaveLength(1)
    expect(header.emitted('add')).toHaveLength(1)
  })
})

describe('the form of an album', () => {
  it('starts from the event it is made for', async () => {
    /**
     * Given the form of a new album of the brocante
     * Then it comes with the event's title, its day in Paris and the event chosen
     */
    const event = { id: 12, title: 'Brocante', starts_at: '2026-09-13T06:00:00Z' }
    const form = await mountSuspended(PhotosAlbumForm, { props: { event, save: vi.fn() } })

    await vi.waitFor(() => expect(form.findAll('option')).toHaveLength(2))
    expect(form.get<HTMLInputElement>('input[maxlength]').element.value).toBe('Brocante')
    expect(form.get<HTMLInputElement>('input[type="date"]').element.value).toBe('2026-09-13')
    expect(form.get<HTMLSelectElement>('select').element.value).toBe('12')
    expect(form.get('button[type="submit"]').text()).toBe('Créer l’album')
  })

  it('places a refusal under its field', async () => {
    const save = vi.fn().mockResolvedValue({ form: [], fields: { title: ['Ce champ ne peut pas être vide.'] } })
    const form = await mountSuspended(PhotosAlbumForm, { props: { album: boardAlbum(), save }, attachTo: document.body })

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.text()).toContain('Ce champ ne peut pas être vide.'))
    expect(save).toHaveBeenCalledWith({ title: 'Brocante 2026', date: '2026-09-13', event: 12 })
    expect(form.emitted('saved')).toBeUndefined()
  })

  it('deletes the album and its photos, once confirmed', async () => {
    /**
     * Given the form of an album of three photos
     * When a member asks to delete it, then confirms
     * Then the question names the album and its photos, and the album is deleted
     */
    const remove = vi.fn().mockResolvedValue(null)
    const form = await mountSuspended(PhotosAlbumForm, { props: { album: boardAlbum(), save: vi.fn(), remove }, attachTo: document.body })

    await button(form, 'Supprimer l’album')?.trigger('click')
    expect(form.text()).toContain('Supprimer « Brocante 2026 » et ses 3 photos ?')
    await button(form, 'Supprimer définitivement')?.trigger('click')

    await vi.waitFor(() => expect(form.emitted('deleted')).toHaveLength(1))
    expect(remove).toHaveBeenCalledOnce()
  })
})
