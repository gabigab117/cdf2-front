import type { components } from '~/types/api'
import { mockApi } from './api'
import { julie } from './events'

type AlbumItemOut = components['schemas']['AlbumItemOut']
type AlbumOut = components['schemas']['AlbumOut']
type EventCoverOut = components['schemas']['EventCoverOut']
type PhotoOut = components['schemas']['PhotoOut']
type PublicAlbumItemOut = components['schemas']['PublicAlbumItemOut']
type PublicAlbumOut = components['schemas']['PublicAlbumOut']

/** A fictitious photo of the brocante, added by Julie, neither hidden nor awaiting a check. */
export function photo(changes: Partial<PhotoOut> = {}): PhotoOut {
  return {
    id: 41,
    original_name: 'IMG_0042.webp',
    width: 4000,
    height: 3000,
    taken_at: '2026-09-13T08:30:00Z',
    hidden: false,
    image_rights_to_review: false,
    uploaded_by: julie,
    created_at: '2026-09-14T18:00:00Z',
    ...changes,
  }
}

/** The brocante's album as a list shows it: published, with its cover. */
export function albumItem(changes: Partial<AlbumItemOut> = {}): AlbumItemOut {
  return {
    id: 5,
    title: 'Brocante 2026',
    date: '2026-09-13',
    event: { id: 12, title: 'Brocante' },
    published: true,
    cover: 41,
    photos_count: 3,
    ...changes,
  }
}

/** The brocante's album and its three photos: the cover, one more, and one hidden and awaiting a check. */
export function boardAlbum(changes: Partial<AlbumOut> = {}): AlbumOut {
  return {
    ...albumItem(),
    contributors_count: 1,
    created_at: '2026-09-14T17:00:00Z',
    photos: [
      photo(),
      photo({ id: 42, original_name: 'IMG_0043.webp' }),
      photo({ id: 43, original_name: 'IMG_0044.webp', hidden: true, image_rights_to_review: true }),
    ],
    ...changes,
  }
}

/**
 * The cover of Halloween, a photo of its previous edition's album, which the site
 * shows; its own album comes first, private and empty.
 */
export function eventCover(changes: Partial<EventCoverOut> = {}): EventCoverOut {
  return {
    cover: 41,
    visible: true,
    albums: [
      albumItem({ id: 6, title: 'Halloween 2026', date: '2026-10-31', event: { id: 12, title: 'Halloween des enfants' }, published: false, cover: null, photos_count: 0 }),
      albumItem({ title: 'Halloween 2025', date: '2025-10-31', event: { id: 3, title: 'Halloween des enfants' } }),
    ],
    ...changes,
  }
}

/** A size of a photo, as the API sends it: a WebP. */
export function photoFile(): Response {
  return new Response(new Blob(['webp'], { type: 'image/webp' }), { headers: { 'Content-Type': 'image/webp' } })
}

/** Mocks the files of the photos, in a size, for the tiles that read them. */
export function mockPhotoFiles(ids: number[], rendition: 'thumbnail' | 'display' = 'thumbnail'): void {
  for (const id of ids) {
    mockApi('/api/board/photos/{photo_id}/{rendition}', { handler: photoFile }, { photo_id: id, rendition })
  }
}

/** The brocante's album as the site lists it: its visible photos alone, and no one's name. */
export function publicAlbumItem(changes: Partial<PublicAlbumItemOut> = {}): PublicAlbumItemOut {
  return {
    slug: '5-brocante-2026',
    title: 'Brocante 2026',
    date: '2026-09-13',
    cover: 41,
    photos_count: 2,
    ...changes,
  }
}

/** The same album with its photos, as its page on the site shows it. */
export function publicAlbum(changes: Partial<PublicAlbumOut> = {}): PublicAlbumOut {
  return { ...publicAlbumItem(), photos: [41, 42], ...changes }
}
