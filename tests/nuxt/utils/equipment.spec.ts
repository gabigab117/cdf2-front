import { describe, expect, it } from 'vitest'
import { equipmentOut } from '../helpers/equipment'

describe('the address of the Matériel page', () => {
  it('reads the equipment shown, and the form of a new one', () => {
    expect(parseInventoryQuery({ materiel: '12' })).toEqual({ equipment: 12 })
    expect(parseInventoryQuery({ materiel: 'nouveau' })).toEqual({ equipment: 'new' })
  })

  it('leaves out what it does not know', () => {
    expect(parseInventoryQuery({ materiel: 'abc' })).toEqual({ equipment: null })
    expect(parseInventoryQuery({ materiel: '-3' })).toEqual({ equipment: null })
  })

  it('writes back what it reads', () => {
    expect(inventoryQuery({ equipment: 12 })).toEqual({ materiel: '12' })
    expect(inventoryQuery({ equipment: 'new' })).toEqual({ materiel: 'nouveau' })
    expect(inventoryQuery({ equipment: null })).toEqual({ materiel: undefined })
  })
})

describe('the figures of the inventory', () => {
  it('count the references, those partly taken today and the pieces under repair', () => {
    expect(inventoryFigures({ references: 14, taken_today: 3, pieces_under_repair: 5 }))
      .toBe('14 références · 3 en partie prêtées aujourd’hui · 5 pièces en réparation')
    expect(inventoryFigures({ references: 1, taken_today: 0, pieces_under_repair: 1 }))
      .toBe('1 référence · 0 en partie prêtée aujourd’hui · 1 pièce en réparation')
  })
})

describe('the equipment form', () => {
  it('starts a new equipment with a piece', () => {
    expect(newEquipmentFields()).toEqual({ name: '', total: '1', repair: '0', repairNote: '' })
  })

  it('edits an equipment as the API gave it, and sends it whole', () => {
    const fields = equipmentFields(equipmentOut())

    expect(fields).toEqual({
      name: 'Barnums 3 × 3 m',
      total: '4',
      repair: '1',
      repairNote: 'Toile déchirée sur un côté.',
    })
    expect(equipmentPayload({ ...fields, repair: '0' })).toEqual({
      name: 'Barnums 3 × 3 m',
      total_quantity: 4,
      repair_quantity: 0,
      repair_note: 'Toile déchirée sur un côté.',
    })
  })

  it('sends no number for an empty quantity', () => {
    const payload = equipmentPayload({ ...equipmentFields(equipmentOut()), total: ' ' })

    expect(payload.total_quantity).toBeNaN()
  })

  it('names a field the form cannot show its error under', () => {
    expect(equipmentFieldLabel('repair_quantity')).toBe('En réparation')
    expect(equipmentFieldLabel('lines')).toBe('lines')
  })
})
