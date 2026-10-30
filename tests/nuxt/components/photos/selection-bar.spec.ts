import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosSelectionBar from '~/components/photos/SelectionBar.vue'
import { button } from '../../helpers/form'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardAlbum, photo } from '../../helpers/photos'

const empty = () => new Response(null, { status: 204 })

function mountBar(photos = boardAlbum().photos.slice(0, 2)) {
  return mountSuspended(PhotosSelectionBar, { props: { album: boardAlbum(), photos }, attachTo: document.body })
}

describe('the bar of a selection', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('counts the photos selected, and takes a cover only of one', async () => {
    const two = await mountBar()
    expect(two.get('[role="status"]').text()).toBe('2 photos sélectionnées')
    expect(button(two, 'Couverture')?.attributes('disabled')).toBeDefined()

    const one = await mountBar([photo({ id: 42 })])
    expect(one.get('[role="status"]').text()).toBe('1 photo sélectionnée')
    expect(button(one, 'Couverture')?.attributes('disabled')).toBeUndefined()
  })

  it('hides the selection, or shows it again once all of it is hidden', async () => {
    /**
     * Given two photos selected, one of them hidden
     * When a member hides them, then selects only hidden photos and shows them again
     * Then the first sends hidden, the second not hidden, and the album is fetched again
     */
    mockApi('/api/board/albums/{album_id}/photos/hidden', { method: 'PUT', handler: empty }, { album_id: 5 })
    const sent = recordRequests()
    const mixed = await mountBar([photo(), photo({ id: 43, hidden: true })])
    const hidden = await mountBar([photo({ id: 43, hidden: true })])

    await button(mixed, 'Masquer du site')?.trigger('click')
    await button(hidden, 'Réafficher')?.trigger('click')

    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent.map(request => request.body)).toEqual([{ photos: [41, 43], hidden: true }, { photos: [43], hidden: false }])
    await vi.waitFor(() => expect(mixed.emitted('changed')).toHaveLength(1))
  })

  it('holds the selection for its image rights, or releases it once all of it awaits', async () => {
    mockApi('/api/board/albums/{album_id}/photos/image-rights-to-review', { method: 'PUT', handler: empty }, { album_id: 5 })
    const sent = recordRequests()
    const awaiting = await mountBar([photo({ image_rights_to_review: true })])
    const clear = await mountBar()

    await button(awaiting, 'Vérifiée')?.trigger('click')
    await button(clear, 'À vérifier')?.trigger('click')

    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent.map(request => request.body)).toEqual([
      { photos: [41], image_rights_to_review: false },
      { photos: [41, 42], image_rights_to_review: true },
    ])
  })

  it('makes the one photo selected the album\'s cover', async () => {
    mockApi('/api/board/albums/{album_id}/cover', { method: 'PUT', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    const sent = recordRequests()
    const bar = await mountBar([photo({ id: 42 })])

    await button(bar, 'Couverture')?.trigger('click')

    await vi.waitFor(() => expect(bar.emitted('changed')).toHaveLength(1))
    expect(sent[0]?.body).toEqual({ cover: 42 })
  })

  it('deletes the selection once confirmed', async () => {
    mockApi('/api/board/albums/{album_id}/photos/delete', { method: 'POST', handler: empty }, { album_id: 5 })
    const sent = recordRequests()
    const bar = await mountBar()

    await button(bar, 'Supprimer')?.trigger('click')
    expect(bar.text()).toContain('Supprimer définitivement 2 photos ?')
    expect(sent).toEqual([])
    await button(bar, 'Supprimer définitivement')?.trigger('click')

    await vi.waitFor(() => expect(bar.emitted('deleted')).toHaveLength(1))
    expect(sent[0]?.body).toEqual({ photos: [41, 42] })
  })

  it('says why an action failed, and gives up the selection on demand', async () => {
    const refusal = { detail: [{ type: 'validation_error', loc: ['body', 'photos'], msg: 'Choisissez des photos de l’album.' }] }
    mockApi('/api/board/albums/{album_id}/photos/hidden', { method: 'PUT', handler: () => apiResponse(422, refusal) }, { album_id: 5 })
    const bar = await mountBar()

    await button(bar, 'Masquer du site')?.trigger('click')
    await button(bar, 'Désélectionner')?.trigger('click')

    await vi.waitFor(() => expect(bar.get('[role="alert"]').text()).toBe('Choisissez des photos de l’album.'))
    expect(bar.emitted('changed')).toBeUndefined()
    expect(bar.emitted('clear')).toHaveLength(1)
  })
})
