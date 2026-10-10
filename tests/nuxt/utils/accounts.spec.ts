import { describe, expect, it } from 'vitest'

describe('the accounts', () => {
  it('reads the link of an email after its « # »', () => {
    expect(passwordLink('#MTI.d2abcd-0123456789abcdef')).toEqual({ uid: 'MTI', token: 'd2abcd-0123456789abcdef' })
    expect(passwordLink('MTI.d2abcd')).toEqual({ uid: 'MTI', token: 'd2abcd' })
    expect(passwordLink('')).toBeNull()
    expect(passwordLink('#MTI')).toBeNull()
    expect(passwordLink('#MTI.')).toBeNull()
    expect(passwordLink('#MTI.a.b')).toBeNull()
  })

  it.each([
    [{ state: 'active', link_sent_at: null }, { label: 'Actif', tone: 'azur' }],
    [{ state: 'inactive', link_sent_at: '2026-10-01T08:00:00Z' }, { label: 'Désactivé', tone: 'neutral' }],
    [{ state: 'pending', link_sent_at: '2026-10-01T08:00:00Z' }, { label: 'Invitation envoyée le 2026-10-01T08:00:00Z', tone: 'ambre' }],
    [{ state: 'pending', link_sent_at: null }, { label: 'Lien non envoyé', tone: 'alert' }],
  ] as const)('pills an account: %o', (account, pill) => {
    expect(accountPill(account, iso => iso)).toEqual(pill)
  })

  it('offers « Aucune fonction », then the positions in order', () => {
    expect(POSITION_OPTIONS.map(option => option.label)).toEqual([
      'Aucune fonction', 'Président·e', 'Vice-président·e', 'Trésorier·e', 'Trésorier·e adjoint·e', 'Secrétaire', 'Secrétaire adjoint·e',
    ])
  })
})
