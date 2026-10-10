import { describe, expect, it } from 'vitest'
import { marc } from '../helpers/notes'

describe('the notes of the board', () => {
  it('names a note\'s author in passing, or a former member once the account is gone', () => {
    expect(authorName(marc)).toBe('Marc D.')
    expect(authorName(null)).toBe('Ancien membre')
  })

  it('offers no tag first, then the tags of the mockup', () => {
    expect(NOTE_TAG_OPTIONS.map(option => [option.value, option.label])).toEqual([
      [null, 'Sans étiquette'],
      ['minutes', 'Compte rendu'],
      ['budget', 'Budget'],
      ['logistics', 'Logistique'],
    ])
  })

  it('names the fields of a note for the errors its forms cannot place', () => {
    expect(noteFieldLabel('event')).toBe('Événement')
    expect(noteFieldLabel('lines.0.quantity')).toBe('lines.0.quantity')
  })
})
