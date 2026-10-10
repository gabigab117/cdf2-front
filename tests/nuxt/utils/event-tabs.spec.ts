import { describe, expect, it } from 'vitest'

describe('the board\'s page of an event', () => {
  it.each([
    ['nothing', {}, { tab: 'notes', page: 1 }],
    ['the public information', { onglet: 'infos-publiques' }, { tab: 'public', page: 1 }],
    ['a page of the notes', { page: '2' }, { tab: 'notes', page: 2 }],
    ['a tab it does not know', { onglet: 'public' }, { tab: 'notes', page: 1 }],
    ['page 0', { page: '0' }, { tab: 'notes', page: 1 }],
    ['two tabs', { onglet: ['infos-publiques', 'notes'] }, { tab: 'notes', page: 1 }],
  ])('reads in its address %s', (_case, query, expected) => {
    expect(parseEventPageQuery(query)).toEqual(expected)
  })

  it('writes in its address only what differs from the first page of the notes', () => {
    expect(eventPageQuery({ tab: 'notes', page: 1 })).toEqual({ onglet: undefined, page: undefined })
    expect(eventPageQuery({ tab: 'public', page: 2 })).toEqual({ onglet: 'infos-publiques', page: '2' })
  })
})
