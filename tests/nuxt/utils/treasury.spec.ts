import { describe, expect, it } from 'vitest'
import { ledgerEntry } from '../helpers/treasury'

// Thursday 1 October 2026, the mockup's day, in Paris.
const NOW = Date.parse('2026-10-01T10:00:00+02:00')

describe('parseTreasuryQuery', () => {
  it('reads the fiscal year, the filter and the page of an address', () => {
    expect(parseTreasuryQuery({ exercice: '2025', evenement: '12', page: '2' })).toEqual({ year: 2025, filter: 12, page: 2 })
    expect(parseTreasuryQuery({ evenement: 'aucun' })).toEqual({ year: null, filter: 'general', page: 1 })
  })

  it('leaves out what the page does not know', () => {
    expect(parseTreasuryQuery({ exercice: 'cette année', evenement: 'brocante', page: '-1' })).toEqual({ year: null, filter: null, page: 1 })
  })
})

describe('treasuryQuery', () => {
  it('writes the fiscal year, the filter and the page, the defaults left out', () => {
    expect(treasuryQuery({ year: 2025, filter: 'general', page: 2 })).toEqual({ exercice: '2025', evenement: 'aucun', page: '2' })
    expect(treasuryQuery({ year: null, filter: 12, page: 1 })).toEqual({ exercice: undefined, evenement: '12', page: undefined })
    expect(treasuryQuery({ year: null, filter: null, page: 1 })).toEqual({ exercice: undefined, evenement: undefined, page: undefined })
  })

  it('leads to the journal of a page', () => {
    expect(ledgerLocation(LEDGER_PATH, { year: 2026, filter: null, page: 1 })).toEqual({ path: '/bureau/tresorerie/journal', query: { exercice: '2026', evenement: undefined, page: undefined } })
  })
})

describe('ledgerFilters', () => {
  it('asks the API for the lines of a year, of an event or without one', () => {
    expect(ledgerFilters(2026, null)).toEqual({ year: 2026 })
    expect(ledgerFilters(2026, 12)).toEqual({ year: 2026, event: 12 })
    expect(ledgerFilters(2026, 'general')).toEqual({ year: 2026, general: true })
  })
})

describe('shownYear and yearSpan', () => {
  it('shows the current year unless the address names one', () => {
    expect(shownYear({ year: null, filter: null, page: 1 }, NOW)).toBe(2026)
    expect(shownYear({ year: 2025, filter: null, page: 1 }, NOW)).toBe(2025)
  })

  it('tells how far the figures of a year go', () => {
    expect(yearSpan(2026, NOW)).toBe('Depuis le 1er janvier')
    expect(yearSpan(2025, NOW)).toBe('Du 1er janvier au 31 décembre 2025')
  })
})

describe('the options of a line', () => {
  it('offers the categories of its kind, « Divers » in both', () => {
    expect(categoryOptions('expense').map(option => option.label)).toEqual([
      'Achats alimentaires', 'Boissons', 'Location de matériel', 'Décoration', 'Lots et cadeaux', 'Assurance', 'Frais bancaires', 'Divers',
    ])
    expect(categoryOptions('income').map(option => option.label)).toEqual([
      'Buvette', 'Emplacements', 'Entrées et tickets', 'Subvention', 'Cotisations', 'Dons', 'Divers',
    ])
  })

  it('offers « Avancé par un membre » for an expense only', () => {
    expect(paymentMethodOptions('expense').map(option => option.value)).toContain('advance')
    expect(paymentMethodOptions('income').map(option => option.value)).not.toContain('advance')
  })
})

describe('the fields of a line', () => {
  it('starts an expense with food and the association’s card, an income with the bar and cash', () => {
    expect(newEntryFields('expense', '2026-10-01')).toMatchObject({ kind: 'expense', category: 'food', paymentMethod: 'association_card', date: '2026-10-01' })
    expect(newEntryFields('income', '2026-10-01')).toMatchObject({ kind: 'income', category: 'bar', paymentMethod: 'cash' })
  })

  it('takes the defaults of a kind it switches to, and keeps what is typed', () => {
    const advance = { ...newEntryFields('expense', '2026-10-01'), label: 'Courses', amount: '12,50', paymentMethod: 'advance' as const, advancedBy: 7 }

    expect(withKind(advance, 'income')).toMatchObject({ kind: 'income', label: 'Courses', amount: '12,50', category: 'bar', paymentMethod: 'cash', advancedBy: null })
  })

  it('reads a line back, its amount the French way', () => {
    expect(entryFields(ledgerEntry())).toEqual({
      kind: 'expense',
      label: 'Courses buvette',
      amount: '286,30',
      date: '2026-09-12',
      category: 'drinks',
      paymentMethod: 'advance',
      advancedBy: 7,
      event: 3,
      supplier: '',
      note: '',
    })
  })

  it('sends a line whole, its member only for an advance', () => {
    const fields = { ...entryFields(ledgerEntry()), amount: '1 286,30' }

    expect(entryPayload(fields)).toEqual({
      date: '2026-09-12',
      kind: 'expense',
      label: 'Courses buvette',
      amount: '1286.30',
      category: 'drinks',
      payment_method: 'advance',
      advanced_by: 7,
      event: 3,
      supplier: '',
      note: '',
    })
    expect(entryPayload({ ...fields, paymentMethod: 'cash' }).advanced_by).toBeNull()
  })

  it('needs a label and an amount above zero before it is sent', () => {
    expect(isEntryComplete({ label: 'Courses', amount: '12,50' })).toBe(true)
    expect(isEntryComplete({ label: '  ', amount: '12,50' })).toBe(false)
    expect(isEntryComplete({ label: 'Courses', amount: '0' })).toBe(false)
    expect(isEntryComplete({ label: 'Courses', amount: 'douze' })).toBe(false)
  })

  it('names a field for an error its form cannot show', () => {
    expect(entryFieldLabel('payment_method')).toBe('Moyen de paiement')
    expect(entryFieldLabel('unknown')).toBe('unknown')
  })
})

describe('a line as the journal writes it', () => {
  it('takes an expense out and brings an income in', () => {
    expect(signedAmount(ledgerEntry())).toBe(-286.3)
    expect(signedAmount(ledgerEntry({ kind: 'income', amount: '1862.50' }))).toBe(1862.5)
  })

  it('names who advanced it, or its payment method', () => {
    expect(paymentText(ledgerEntry())).toBe('Avancé par Julie R.')
    expect(paymentText(ledgerEntry({ advanced_by: null }))).toBe('Avancé par un ancien membre')
    expect(paymentText(ledgerEntry({ payment_method: 'direct_debit', advanced_by: null }))).toBe('Prélèvement')
  })

  it('leads to its page', () => {
    expect(entryPath(4)).toBe('/bureau/tresorerie/ecritures/4')
  })
})
