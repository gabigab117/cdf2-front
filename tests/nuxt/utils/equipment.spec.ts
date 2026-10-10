import { describe, expect, it } from 'vitest'
import { equipmentOut } from '../helpers/equipment'

describe('the address of the Matériel page', () => {
  it('reads the equipment shown, the form of a new one, and the category', () => {
    expect(parseInventoryQuery({ materiel: '12', categorie: 'barnums' })).toEqual({ equipment: 12, category: 'marquees' })
    expect(parseInventoryQuery({ materiel: 'nouveau' })).toEqual({ equipment: 'new', category: null })
  })

  it('leaves out what it does not know', () => {
    expect(parseInventoryQuery({ materiel: 'abc', categorie: 'tentes' })).toEqual({ equipment: null, category: null })
    expect(parseInventoryQuery({ materiel: '-3' })).toEqual({ equipment: null, category: null })
  })

  it('writes back what it reads', () => {
    expect(inventoryQuery({ equipment: 12, category: 'sound_and_light' })).toEqual({ materiel: '12', categorie: 'son-et-lumiere' })
    expect(inventoryQuery({ equipment: 'new', category: null })).toEqual({ materiel: 'nouveau', categorie: undefined })
    expect(inventoryQuery({ equipment: null, category: null })).toEqual({ materiel: undefined, categorie: undefined })
    expect(equipmentLocation(5)).toEqual({ path: '/bureau/materiel', query: { materiel: '5' } })
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
  it('starts a new equipment with a piece, in the chip’s category', () => {
    expect(newEquipmentFields('kitchen')).toEqual({
      name: '',
      category: 'kitchen',
      storageLocation: '',
      total: '1',
      repair: '0',
      unitValue: '',
      repairNote: '',
    })
    expect(newEquipmentFields(null).category).toBe('')
  })

  it('edits an equipment as the API gave it, and sends it whole', () => {
    const fields = equipmentFields(equipmentOut())

    expect(fields).toEqual({
      name: 'Barnums 3 × 3 m',
      category: 'marquees',
      storageLocation: 'Garage communal',
      total: '4',
      repair: '1',
      unitValue: '250,00',
      repairNote: 'Toile déchirée sur un côté.',
    })
    expect(equipmentPayload({ ...fields, repair: '0', unitValue: '1 250,50 €' })).toEqual({
      name: 'Barnums 3 × 3 m',
      category: 'marquees',
      storage_location: 'Garage communal',
      total_quantity: 4,
      repair_quantity: 0,
      unit_value: '1250.50',
      repair_note: 'Toile déchirée sur un côté.',
    })
  })

  it('sends no value when none is known, and no number for an empty quantity', () => {
    const payload = equipmentPayload({ ...equipmentFields(equipmentOut({ unit_value: null })), total: ' ' })

    expect(payload.unit_value).toBeNull()
    expect(payload.total_quantity).toBeNaN()
  })

  it('names a field the form cannot show its error under', () => {
    expect(equipmentFieldLabel('repair_quantity')).toBe('En réparation')
    expect(equipmentFieldLabel('lines')).toBe('lines')
  })
})
