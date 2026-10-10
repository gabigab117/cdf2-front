import { describe, expect, it } from 'vitest'
import { loanOut } from '../helpers/equipment'

describe('the loan form', () => {
  it('starts a loan to an association, on a day, without equipment', () => {
    expect(newLoanFields('2026-10-01')).toEqual({
      borrowerType: 'association',
      borrowerName: '',
      purpose: '',
      phone: '',
      event: null,
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      deposit: '',
      notes: '',
      quantities: {},
    })
  })

  it('edits a loan as the API gave it, and sends it whole', () => {
    const fields = loanFields(loanOut())

    expect(fields).toMatchObject({ deposit: '150,00', quantities: { 5: 2 } })
    expect(loanPayload({ ...fields, deposit: '' }, [5])).toEqual({
      borrower_type: 'association',
      borrower_name: 'Club de football',
      purpose: 'Tournoi jeunes',
      phone: '01 23 45 67 89',
      event: null,
      start_date: '2026-10-16',
      end_date: '2026-10-18',
      deposit_amount: null,
      notes: '',
      lines: [{ equipment: 5, quantity: 2 }],
    })
  })

  it('sends the lines in the inventory’s order, those it lacks last', () => {
    const fields = { ...newLoanFields('2026-10-01'), quantities: { 9: 1, 7: 4, 5: 2 } }

    expect(loanLines(fields, [5, 7])).toEqual([
      { equipment: 5, quantity: 2 },
      { equipment: 7, quantity: 4 },
      { equipment: 9, quantity: 1 },
    ])
  })

  it('changes a quantity, an equipment of none leaving the loan', () => {
    expect(withQuantity({ 5: 2 }, 7, 3)).toEqual({ 5: 2, 7: 3 })
    expect(withQuantity({ 5: 2, 7: 3 }, 5, 0)).toEqual({ 7: 3 })
  })

  it('counts the days of a loan, both of them', () => {
    expect(loanDays('2026-10-16', '2026-10-18')).toBe(3)
    expect(loanDays('2026-10-16', '2026-10-15')).toBe(0)
    expect(daysText(1)).toBe('1 jour')
    expect(daysText(3)).toBe('3 jours')
  })

  it('names the field of an error the form cannot show under it', () => {
    expect(loanFieldLabel('end_date')).toBe('Retour')
    expect(loanFieldLabel('lines.1.quantity', ['Barnums', 'Tables'])).toBe('Tables')
    expect(loanFieldLabel('lines.4.quantity')).toBe('Matériel')
    expect(loanFieldLabel('unknown')).toBe('unknown')
  })
})

describe('the addresses of the loans', () => {
  it('lead to a loan, its form, and read an id from an address', () => {
    expect(loanLocation(20)).toEqual({ path: '/bureau/prets', query: { pret: '20' } })
    expect(editLoanPath(20)).toBe('/bureau/prets/20/modifier')
    expect(queryId('12')).toBe(12)
    expect(queryId('-1')).toBeNull()
    expect(queryId(['12'])).toBeNull()
    expect(queryId(undefined)).toBeNull()
  })
})
