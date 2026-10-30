import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PhotosUploadZone from '~/components/photos/UploadZone.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { photo } from '../../helpers/photos'

const UPLOAD = '/api/board/albums/{album_id}/photos'

const photos = ['IMG_0001.jpg', 'IMG_0002.jpg', 'IMG_0003.HEIC'].map(name => new File(['photo'], name, { type: 'image/jpeg' }))

const duplicate = { detail: [{ type: 'validation_error', loc: ['body', 'file'], msg: 'Cette photo est déjà dans l’album.' }] }

/**
 * Mocks the upload, each answer held until the test releases it: the photos go
 * one after the other. The second photo is refused as a duplicate.
 */
function heldUploads() {
  const releases: Array<() => void> = []
  mockApi(UPLOAD, {
    method: 'POST',
    handler: () => new Promise<Response>((resolve) => {
      const refused = releases.length === 1
      releases.push(() => resolve(refused ? apiResponse(422, duplicate) : apiResponse(201, photo())))
    }),
  }, { album_id: 5 })
  return releases
}

describe('the drop zone of an album', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('sends the photos one after the other, follows them, and lists those refused', async () => {
    /**
     * Given three photos dropped onto an album's zone
     * Then the second is sent only once the first is recorded, the bar following them
     * And the duplicate is listed under its file's name, the others going on
     * And the album is fetched again once all three are sent
     */
    const releases = heldUploads()
    const zone = await mountSuspended(PhotosUploadZone, { props: { albumId: 5 } })

    await zone.get('.border-dashed').trigger('drop', { dataTransfer: { files: photos } })

    await vi.waitFor(() => expect(releases).toHaveLength(1))
    expect(zone.get('[role="status"]').text()).toBe('0 photo envoyée sur 3')
    releases[0]?.()
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    expect(zone.get('[role="status"]').text()).toBe('1 photo envoyée sur 3')
    expect(zone.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('1')
    releases[1]?.()
    await vi.waitFor(() => expect(releases).toHaveLength(3))
    expect(zone.emitted('uploaded')).toBeUndefined()
    releases[2]?.()

    await vi.waitFor(() => expect(zone.emitted('uploaded')).toHaveLength(1))
    expect(zone.find('[role="progressbar"]').exists()).toBe(false)
    expect(zone.get('[role="alert"]').text()).toContain('1 photo refusée :')
    expect(zone.get('[role="alert"]').text()).toContain('IMG_0002.jpg : Cette photo est déjà dans l’album.')
  })

  it('offers the photos an album takes, and opens its picker on demand', async () => {
    const zone = await mountSuspended(PhotosUploadZone, { props: { albumId: 5 } })
    const picker = zone.get<HTMLInputElement>('input[type="file"]')
    const click = vi.spyOn(picker.element, 'click').mockImplementation(() => {})

    ;(zone.vm as unknown as { choose: () => void }).choose()

    expect(click).toHaveBeenCalledOnce()
    expect(picker.attributes()).toMatchObject({ accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif', multiple: '' })
    expect(zone.text()).toContain('JPEG, PNG, HEIC — redimensionnées et sans données GPS.')
  })
})
