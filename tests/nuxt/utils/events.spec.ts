import { describe, expect, it } from 'vitest'

describe('the board\'s list of events', () => {
  it.each([
    ['nothing', {}, { period: 'upcoming', page: 1 }],
    ['the past events', { periode: 'passes' }, { period: 'past', page: 1 }],
    ['a page', { periode: 'passes', page: '2' }, { period: 'past', page: 2 }],
    ['a period it does not know', { periode: 'demain' }, { period: 'upcoming', page: 1 }],
    ['page 0', { page: '0' }, { period: 'upcoming', page: 1 }],
    ['a page that is not a number', { page: 'abc' }, { period: 'upcoming', page: 1 }],
    ['two pages', { page: ['2', '3'] }, { period: 'upcoming', page: 1 }],
  ])('reads in its address %s', (_case, query, expected) => {
    expect(parseEventListQuery(query)).toEqual(expected)
  })

  it('writes in its address only what differs from the first page of upcoming events', () => {
    expect(eventListQuery({ period: 'upcoming', page: 1 })).toEqual({ periode: undefined, page: undefined })
    expect(eventListQuery({ period: 'past', page: 3 })).toEqual({ periode: 'passes', page: '3' })
  })

  it('leads to the page of an event, and to its form', () => {
    expect(eventPath(12)).toBe('/bureau/evenements/12')
    expect(eventEditPath(12)).toBe('/bureau/evenements/12/modifier')
  })
})

describe('the agenda of the site', () => {
  it.each([
    ['nothing', {}, { category: null, page: 1 }],
    ['a category', { categorie: 'jeux' }, { category: 'games', page: 1 }],
    ['the category of the festivities', { categorie: 'fetes' }, { category: 'festivities', page: 1 }],
    ['a category and a page', { categorie: 'enfants', page: '2' }, { category: 'children', page: 2 }],
    ['a category it does not know', { categorie: 'children' }, { category: null, page: 1 }],
    ['two categories', { categorie: ['jeux', 'repas'] }, { category: null, page: 1 }],
  ])('reads in its address %s', (_case, query, expected) => {
    expect(parseAgendaQuery(query)).toEqual(expected)
  })

  it('writes in its address only what differs from the first page of the whole agenda', () => {
    expect(agendaQuery({ category: null, page: 1 })).toEqual({ categorie: undefined, page: undefined })
    expect(agendaQuery({ category: 'markets', page: 2 })).toEqual({ categorie: 'marches', page: '2' })
  })

  it('leads to the public page of an event', () => {
    expect(publicEventPath('halloween-des-enfants-2026')).toBe('/evenements/halloween-des-enfants-2026')
  })
})
