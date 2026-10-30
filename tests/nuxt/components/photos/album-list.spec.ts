import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosAlbumList from '~/components/photos/AlbumList.vue'
import { stubObjectUrls } from '../../helpers/files'
import { field } from '../../helpers/form'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { eventItem, page } from '../../helpers/events'
import { albumItem, boardAlbum, mockPhotoFiles } from '../../helpers/photos'

function mountList(albums = [albumItem(), albumItem({ id: 7, title: 'Coulisses du bureau', published: false, cover: null, photos_count: 22, event: null })]) {
  return mountSuspended(PhotosAlbumList, { props: { albums, selected: 5 }, attachTo: document.body })
}

describe('the column of the albums', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00Z')
    mockPhotoFiles([41])
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
    stubObjectUrls()
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('shows each album with its photos and its day, and whether the site shows it', async () => {
    /**
     * Given the brocante's album, published, and the backstage album, private
     * Then the first shows its cover, its day and an eye, and is the one shown
     * And the second shows a padlock and « privé »
     */
    const list = await mountList()

    const rows = list.findAll('a')
    expect(rows.map(row => row.text())).toEqual(['Brocante 20263 photos · 13 sept.', 'Coulisses du bureau22 photos · privé'])
    expect(rows[0]?.attributes()).toMatchObject({ 'href': '/bureau/photos?album=5', 'aria-current': 'true' })
    expect(rows[0]?.find('[aria-label="Public"]').exists()).toBe(true)
    expect(rows[1]?.attributes('aria-current')).toBeUndefined()
    expect(rows[1]?.find('[aria-label="Public"]').exists()).toBe(false)
    expect(rows[1]?.findComponent({ name: 'PhotosRendition' }).exists()).toBe(false)
  })

  it('says how to begin when there is no album yet', async () => {
    const list = await mountList([])

    expect(list.text()).toContain('Aucun album pour l’instant : créez le premier avec « + ».')
  })

  it('creates an album from « + », private until it is published', async () => {
    /**
     * Given the form of a new album, opened by « + »
     * When a member fills in its title and its day, and creates it
     * Then the album is sent without an event, and given to the page
     */
    mockApi('/api/board/albums', { method: 'POST', handler: () => apiResponse(201, boardAlbum({ id: 9, published: false })) })
    const sent = recordRequests()
    const list = await mountList()

    await list.get('button[aria-label="Nouvel album"]').trigger('click')
    await field(list, 'Titre').setValue('Repas des aînés')
    await list.get('input[type="date"]').setValue('2026-11-29')
    await list.get('form').trigger('submit')

    await vi.waitFor(() => expect(list.emitted('created')).toEqual([[boardAlbum({ id: 9, published: false })]]))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({ title: 'Repas des aînés', date: '2026-11-29', event: null })
    expect(list.find('form').exists()).toBe(false)
  })
})
