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
