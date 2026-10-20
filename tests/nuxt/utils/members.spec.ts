import { describe, expect, it } from 'vitest'
import { julie } from '../helpers/events'

const member = { first_name: 'Julie', last_name: 'Roux', email: 'julie.roux@example.test' }

describe('the names of the board members', () => {
  it.each([
    ['their full name', member, 'Julie Roux'],
    ['their first name alone', { ...member, last_name: '' }, 'Julie'],
    ['the address of an account created without a name', { ...member, first_name: '', last_name: '' }, 'julie.roux@example.test'],
  ])('names a member by %s', (_case, named, name) => {
    expect(memberName(named)).toBe(name)
  })

  it.each([
    ['their first name and initial', member, 'Julie R.'],
    ['their first name alone', { ...member, last_name: '' }, 'Julie'],
    ['their last name alone', { ...member, first_name: '' }, 'Roux'],
    ['their address', { ...member, first_name: '', last_name: '' }, 'julie.roux@example.test'],
  ])('names a member in passing by %s', (_case, named, name) => {
    expect(memberShortName(named)).toBe(name)
  })

  it('signs with a member in passing, or a former member once the account is gone', () => {
    expect(memberSignature(member)).toBe('Julie R.')
    expect(memberSignature(null)).toBe('Ancien membre')
  })

  it.each([
    ['by their first name', member, 'Bonjour Julie'],
    ['alone, without a first name', { ...member, first_name: '' }, 'Bonjour'],
    ['alone, while they are not known yet', null, 'Bonjour'],
  ])('greets a member %s', (_case, named, greeting) => {
    expect(memberGreeting(named)).toBe(greeting)
  })
})

describe('the board members to choose from', () => {
  const alain = { id: 8, first_name: 'Alain', last_name: 'Petit', email: 'alain.petit@example.test' }

  it('offers the board members by name, after the choice of nobody', () => {
    const nameless = { id: 9, first_name: '', last_name: '', email: 'tresorerie@example.test' }

    expect(memberOptions([alain, nameless], null, 'Aucun')).toEqual([
      { value: null, label: 'Aucun' },
      { value: 8, label: 'Alain Petit' },
      { value: 9, label: 'tresorerie@example.test' },
    ])
  })

  it('keeps among them a member chosen before who has left the board, once', () => {
    /**
     * Given an event led by a member no longer on the board
     * Then they stay among the leads to choose from, or saving would take
     * them off the event
     */
    expect(memberOptions([alain], julie, 'Aucun').map(option => option.value)).toEqual([null, 8, 7])
    expect(memberOptions([alain, julie], julie, 'Personne').map(option => option.value)).toEqual([null, 8, 7])
  })
})
