import { describe, expect, it } from 'vitest'
import { boardAlbum, photo } from '../helpers/photos'

describe('the address of the Photos page', () => {
  it.each([
    ['an album', { album: '5' }, { album: 5 }],
    ['nothing', {}, { album: null }],
    ['an album it does not know', { album: 'brocante' }, { album: null }],
  ])('reads %s', (_case, query, expected) => {
    expect(parsePhotosQuery(query)).toEqual(expected)
  })

  it('leads to an album, or to the list alone', () => {
    expect(albumLocation(5)).toEqual({ path: '/bureau/photos', query: { album: 5 } })
    expect(albumLocation(null)).toEqual({ path: '/bureau/photos', query: { album: undefined } })
  })
})

describe('the words of an album', () => {
  it('counts its photos', () => {
    expect(photosText(0)).toBe('0 photo')
    expect(photosText(1)).toBe('1 photo')
    expect(photosText(128)).toBe('128 photos')
  })

  it.each([
    [{ photos_count: 128, contributors_count: 3 }, 'ajoutées par 3 membres'],
    [{ photos_count: 1, contributors_count: 1 }, 'ajoutée par 1 membre'],
    [{ photos_count: 4, contributors_count: 0 }, null],
  ])('says who added its photos: %o', (album, expected) => {
    expect(contributorsText(album)).toBe(expected)
  })

  it('counts a selection', () => {
    expect(selectionText(1)).toBe('1 photo sélectionnée')
    expect(selectionText(3)).toBe('3 photos sélectionnées')
  })
})

describe('the flags of a selection', () => {
  it('holds a flag only when every photo selected has it', () => {
    const hidden = photo({ hidden: true })
    const both = photo({ hidden: true, image_rights_to_review: true })

    expect(selectionFlags([hidden, both])).toEqual({ hidden: true, toReview: false })
    expect(selectionFlags([both])).toEqual({ hidden: true, toReview: true })
    expect(selectionFlags([photo(), both])).toEqual({ hidden: false, toReview: false })
    expect(selectionFlags([])).toEqual({ hidden: false, toReview: false })
  })
})

describe('the form of an album', () => {
  it('starts empty, or with the title and the day in Paris of the event it is made for', () => {
    expect(newAlbumFields()).toEqual({ title: '', date: '', event: null })
    // 23:30 in UTC is already the next day in Paris.
    const event = { id: 12, title: 'Brocante', starts_at: '2026-09-12T22:30:00Z' }
    expect(newAlbumFields(event)).toEqual({ title: 'Brocante', date: '2026-09-13', event: 12 })
  })

  it('reads an album to correct', () => {
    expect(albumFields(boardAlbum())).toEqual({ title: 'Brocante 2026', date: '2026-09-13', event: 12 })
    expect(albumFields(boardAlbum({ event: null }))).toEqual({ title: 'Brocante 2026', date: '2026-09-13', event: null })
  })
})
