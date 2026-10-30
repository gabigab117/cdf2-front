import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type AlbumIn = components['schemas']['AlbumIn']
type AlbumOut = components['schemas']['AlbumOut']
type PhotoOut = components['schemas']['PhotoOut']

/** The Photos page, where the board keeps its albums. */
export const PHOTOS_PATH = '/bureau/photos'

/** How many albums the column reads: a hundred cover the committee's years. */
export const ALBUMS_PAGE_SIZE = 100

/** What the address of the Photos page holds: the album it shows, `?album=12`. */
export function parsePhotosQuery(query: LocationQuery): { album: number | null } {
  return { album: queryId(query.album) }
}

/** The Photos page, showing an album, or the list alone below 820 px. */
export function albumLocation(album: number | null): RouteLocationRaw {
  return { path: PHOTOS_PATH, query: { album: album ?? undefined } }
}

/** « 1 photo », « 128 photos ». */
export function photosText(count: number): string {
  return countText(count, 'photo', 'photos')
}

/** « ajoutées par 3 membres », or nothing while no member has added one. */
export function contributorsText(album: Pick<AlbumOut, 'photos_count' | 'contributors_count'>): string | null {
  if (album.contributors_count === 0) return null
  const added = album.photos_count < 2 ? 'ajoutée' : 'ajoutées'
  return `${added} par ${countText(album.contributors_count, 'membre', 'membres')}`
}

/** « 3 photos sélectionnées », « 1 photo sélectionnée ». */
export function selectionText(count: number): string {
  return countText(count, 'photo sélectionnée', 'photos sélectionnées')
}

/** What the selected photos are: hidden from the site, awaiting a check, all of them. */
export function selectionFlags(photos: readonly PhotoOut[]): { hidden: boolean, toReview: boolean } {
  return {
    hidden: photos.length > 0 && photos.every(photo => photo.hidden),
    toReview: photos.length > 0 && photos.every(photo => photo.image_rights_to_review),
  }
}

/**
 * The fields of a new album: of an event, it takes its title and its day, which
 * the member completes.
 */
export function newAlbumFields(event?: { id: number, title: string, starts_at: string }): AlbumIn {
  if (!event) return { title: '', date: '', event: null }
  return { title: event.title, date: parisDate(event.starts_at), event: event.id }
}

/** The fields of an album to correct, as the API gave it. */
export function albumFields(album: AlbumOut): AlbumIn {
  return { title: album.title, date: album.date, event: album.event?.id ?? null }
}
