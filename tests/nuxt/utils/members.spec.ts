import { describe, expect, it } from 'vitest'

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
})
