import type { components, paths } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type AlbumIn = components['schemas']['AlbumIn']
type AlbumOut = components['schemas']['AlbumOut']
type PhotoOut = components['schemas']['PhotoOut']
type PhotoRendition = components['schemas']['PhotoRendition']
type UploadBody = paths['/api/board/albums/{album_id}/photos']['post']['requestBody']['content']['multipart/form-data']

/**
 * Writes the board's albums, their photos and an event's cover, and reads the
 * photos' files. Each write gives what it wrote, or what to show; the page
 * fetches the album and the list again.
 */
export function usePhotoWrites() {
  const api = useApi()

  function createAlbum(payload: AlbumIn): Promise<Written<AlbumOut>> {
    return formWrite(api.POST('/api/board/albums', { body: payload }))
  }

  function updateAlbum(id: number, payload: AlbumIn): Promise<Written<AlbumOut>> {
    return formWrite(api.PUT('/api/board/albums/{album_id}', { params: { path: { album_id: id } }, body: payload }))
  }

  /** Shows the album's visible photos on the site, or takes them off it (D17). */
  function publishAlbum(id: number, published: boolean): Promise<string | null> {
    return plainWrite(api.PUT('/api/board/albums/{album_id}/published', { params: { path: { album_id: id } }, body: { published } }))
  }

  function setAlbumCover(id: number, cover: number | null): Promise<string | null> {
    return plainWrite(api.PUT('/api/board/albums/{album_id}/cover', { params: { path: { album_id: id } }, body: { cover } }))
  }

  /** Deletes an album, its photos and their files. */
  function deleteAlbum(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/albums/{album_id}', { params: { path: { album_id: id } } }))
  }

  /** Adds a photo to an album: one per request, as an album's photos are sent. */
  function uploadPhoto(albumId: number, file: File): Promise<Written<PhotoOut>> {
    const form = new FormData()
    form.append('file', file)
    // openapi-typescript types a file as a string: the form data goes as it
    // is, openapi-fetch leaving its Content-Type, and boundary, to the browser.
    const body = form as unknown as UploadBody
    return formWrite(api.POST('/api/board/albums/{album_id}/photos', { params: { path: { album_id: albumId } }, body }))
  }

  /** Hides the selected photos from the site, or shows them again. */
  function hidePhotos(albumId: number, photos: number[], hidden: boolean): Promise<string | null> {
    const path = { album_id: albumId }
    return plainWrite(api.PUT('/api/board/albums/{album_id}/photos/hidden', { params: { path }, body: { photos, hidden } }))
  }

  /** Holds the selected photos off the site until their image rights are checked, or releases them. */
  function reviewImageRights(albumId: number, photos: number[], toReview: boolean): Promise<string | null> {
    const path = { album_id: albumId }
    const body = { photos, image_rights_to_review: toReview }
    return plainWrite(api.PUT('/api/board/albums/{album_id}/photos/image-rights-to-review', { params: { path }, body }))
  }

  /** Deletes the selected photos and their files: also how a removal asked for is done (D17). */
  function deletePhotos(albumId: number, photos: number[]): Promise<string | null> {
    return plainWrite(api.POST('/api/board/albums/{album_id}/photos/delete', { params: { path: { album_id: albumId } }, body: { photos } }))
  }

  /** @returns null once the zip of the selected images is downloaded, or the message to show. */
  function downloadPhotos(album: Pick<AlbumOut, 'id' | 'title'>, photos: number[]): Promise<string | null> {
    const path = { album_id: album.id }
    return downloadFile(
      () => api.POST('/api/board/albums/{album_id}/photos/zip', { params: { path }, body: { photos }, parseAs: 'blob' }),
      `${album.title}.zip`,
    )
  }

  /** @returns a size of a photo, or the message to show. */
  async function readPhotoFile(id: number, rendition: PhotoRendition, signal?: AbortSignal): Promise<{ file: Blob } | { failure: string }> {
    try {
      const { data, error, response } = await api.GET('/api/board/photos/{photo_id}/{rendition}', {
        params: { path: { photo_id: id, rendition } },
        parseAs: 'blob',
        signal,
      })
      return response.ok && data ? { file: data } : { failure: errorMessage(error, response) }
    }
    catch (failure) {
      return { failure: errorMessage(failure) }
    }
  }

  /** Chooses an event's cover among its cover choices, or none. */
  function setEventCover(eventId: number, cover: number | null): Promise<string | null> {
    return plainWrite(api.PUT('/api/board/events/{event_id}/cover', { params: { path: { event_id: eventId } }, body: { cover } }))
  }

  return {
    createAlbum,
    updateAlbum,
    publishAlbum,
    setAlbumCover,
    deleteAlbum,
    uploadPhoto,
    hidePhotos,
    reviewImageRights,
    deletePhotos,
    downloadPhotos,
    readPhotoFile,
    setEventCover,
  }
}
