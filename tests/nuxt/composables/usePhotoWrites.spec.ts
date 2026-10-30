import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubObjectUrls } from '../helpers/files'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../helpers/api'
import { boardAlbum, photo, photoFile } from '../helpers/photos'

const UPLOAD = '/api/board/albums/{album_id}/photos'

describe('usePhotoWrites', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    stubObjectUrls('blob:http://localhost:3000/zip')
  })

  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  it('sends a photo alone, in a form, and gives what it recorded', async () => {
    mockApi(UPLOAD, { method: 'POST', handler: () => apiResponse(201, photo()) }, { album_id: 5 })
    const sent = recordRequests()
    const file = new File(['jpeg'], 'IMG_0042.jpg', { type: 'image/jpeg' })

    const written = await usePhotoWrites().uploadPhoto(5, file)

    expect(written).toEqual({ data: photo(), errors: null })
    expect(sent).toEqual([{ method: 'POST', url: '/api/board/albums/5/photos', body: { file: { name: 'IMG_0042.jpg', type: 'image/jpeg' } } }])
  })

  it('gives the refusal of a photo, on its file', async () => {
    const refusal = { detail: [{ type: 'validation_error', loc: ['body', 'file'], msg: 'Cette photo est déjà dans l’album.' }] }
    mockApi(UPLOAD, { method: 'POST', handler: () => apiResponse(422, refusal) }, { album_id: 5 })

    const written = await usePhotoWrites().uploadPhoto(5, new File(['jpeg'], 'IMG_0042.jpg'))

    expect(written).toEqual({ data: null, errors: { form: [], fields: { file: ['Cette photo est déjà dans l’album.'] } } })
  })

  it('sends a selection with what to do with it', async () => {
    mockApi('/api/board/albums/{album_id}/photos/hidden', { method: 'PUT', handler: () => new Response(null, { status: 204 }) }, { album_id: 5 })
    mockApi('/api/board/albums/{album_id}/photos/image-rights-to-review', { method: 'PUT', handler: () => new Response(null, { status: 204 }) }, { album_id: 5 })
    mockApi('/api/board/albums/{album_id}/photos/delete', { method: 'POST', handler: () => new Response(null, { status: 204 }) }, { album_id: 5 })
    const sent = recordRequests()
    const writes = usePhotoWrites()

    expect(await writes.hidePhotos(5, [41, 42], true)).toBeNull()
    expect(await writes.reviewImageRights(5, [42], false)).toBeNull()
    expect(await writes.deletePhotos(5, [43])).toBeNull()

    expect(sent.map(request => [request.method, request.url, request.body])).toEqual([
      ['PUT', '/api/board/albums/5/photos/hidden', { photos: [41, 42], hidden: true }],
      ['PUT', '/api/board/albums/5/photos/image-rights-to-review', { photos: [42], image_rights_to_review: false }],
      ['POST', '/api/board/albums/5/photos/delete', { photos: [43] }],
    ])
  })

  it('gives the refusal of a selection in a line', async () => {
    const refusal = { detail: [{ type: 'validation_error', loc: ['body', 'photos'], msg: 'Choisissez des photos de l’album.' }] }
    mockApi('/api/board/albums/{album_id}/photos/hidden', { method: 'PUT', handler: () => apiResponse(422, refusal) }, { album_id: 5 })

    expect(await usePhotoWrites().hidePhotos(5, [99], true)).toBe('Choisissez des photos de l’album.')
  })

  it('downloads the zip of a selection under the album\'s title', async () => {
    mockApi('/api/board/albums/{album_id}/photos/zip', {
      method: 'POST',
      handler: () => new Response(new Blob(['zip'], { type: 'application/zip' }), { headers: { 'Content-Type': 'application/zip' } }),
    }, { album_id: 5 })
    const sent = recordRequests()
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {})

    expect(await usePhotoWrites().downloadPhotos(boardAlbum(), [41, 42])).toBeNull()

    expect(sent[0]?.body).toEqual({ photos: [41, 42] })
    expect(clicked.mock.contexts[0]).toMatchObject({ download: 'Brocante 2026.zip' })
  })

  it('reads a size of a photo, or says why it cannot', async () => {
    mockApi('/api/board/photos/{photo_id}/{rendition}', { handler: photoFile }, { photo_id: 41, rendition: 'display' })
    mockApi('/api/board/photos/{photo_id}/{rendition}', { handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { photo_id: 99, rendition: 'display' })
    const writes = usePhotoWrites()

    const read = await writes.readPhotoFile(41, 'display')
    expect('file' in read && read.file.type).toBe('image/webp')
    expect(await writes.readPhotoFile(99, 'display')).toEqual({ failure: 'Introuvable.' })
  })

  it('publishes an album, chooses its cover and an event\'s, and deletes it', async () => {
    const empty = () => new Response(null, { status: 204 })
    mockApi('/api/board/albums/{album_id}/published', { method: 'PUT', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    mockApi('/api/board/albums/{album_id}/cover', { method: 'PUT', handler: () => apiResponse(200, boardAlbum()) }, { album_id: 5 })
    mockApi('/api/board/events/{event_id}/cover', { method: 'PUT', handler: () => apiResponse(200, {}) }, { event_id: 12 })
    mockApi('/api/board/albums/{album_id}', { method: 'DELETE', handler: empty }, { album_id: 5 })
    const sent = recordRequests()
    const writes = usePhotoWrites()

    expect(await writes.publishAlbum(5, true)).toBeNull()
    expect(await writes.setAlbumCover(5, 42)).toBeNull()
    expect(await writes.setEventCover(12, null)).toBeNull()
    expect(await writes.deleteAlbum(5)).toBeNull()

    expect(sent.map(request => [request.method, request.url, request.body])).toEqual([
      ['PUT', '/api/board/albums/5/published', { published: true }],
      ['PUT', '/api/board/albums/5/cover', { cover: 42 }],
      ['PUT', '/api/board/events/12/cover', { cover: null }],
      ['DELETE', '/api/board/albums/5', undefined],
    ])
  })
})
