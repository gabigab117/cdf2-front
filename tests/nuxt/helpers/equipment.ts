import type { components } from '~/types/api'

type EquipmentOut = components['schemas']['EquipmentOut']
type EquipmentAvailabilityOut = components['schemas']['EquipmentAvailabilityOut']
type InventoryOut = components['schemas']['InventoryOut']
type LoanBriefOut = components['schemas']['LoanBriefOut']

/** The mockup's marquees: four, one under repair. */
export function equipmentOut(changes: Partial<EquipmentOut> = {}): EquipmentOut {
  return {
    id: 5,
    name: 'Barnums 3 × 3 m',
    category: 'marquees',
    storage_location: 'Garage communal',
    total_quantity: 4,
    repair_quantity: 1,
    unit_value: '250.00',
    repair_note: 'Toile déchirée sur un côté.',
    ...changes,
  }
}

/** What an equipment offers over a period: by default, none taken. */
export function availabilityItem(
  equipment: Partial<EquipmentOut> = {},
  changes: Partial<Omit<EquipmentAvailabilityOut, 'equipment'>> = {},
): EquipmentAvailabilityOut {
  const item = equipmentOut(equipment)
  return { equipment: item, taken: 0, free: item.total_quantity - item.repair_quantity, conflicts: [], ...changes }
}

/** A fictitious loan of the football club, confirmed, mid-October. */
export function loanBrief(changes: Partial<LoanBriefOut> = {}): LoanBriefOut {
  return {
    id: 20,
    number: 'P-2026-020',
    display_name: 'Club de football',
    purpose: 'Tournoi jeunes',
    borrower_type: 'association',
    state: 'confirmed',
    start_date: '2026-10-16',
    end_date: '2026-10-18',
    ...changes,
  }
}

/** Today's inventory of some equipment, its figures and counts worked out. */
export function inventoryOut(items: EquipmentAvailabilityOut[], day = '2026-10-01'): InventoryOut {
  const count = (category: string) => items.filter(item => item.equipment.category === category).length
  return {
    day,
    items,
    totals: {
      references: items.length,
      taken_today: items.filter(item => item.taken > 0).length,
      pieces_under_repair: items.reduce((sum, item) => sum + item.equipment.repair_quantity, 0),
    },
    counts: {
      total: items.length,
      furniture: count('furniture'),
      marquees: count('marquees'),
      sound_and_light: count('sound_and_light'),
      kitchen: count('kitchen'),
      street_and_games: count('street_and_games'),
    },
  }
}

type LoanOut = components['schemas']['LoanOut']
type AvailabilityOut = components['schemas']['AvailabilityOut']

/** What every equipment offers over some days. */
export function availabilityOut(items: EquipmentAvailabilityOut[], start = '2026-10-16', end = '2026-10-18'): AvailabilityOut {
  return { start, end, items }
}

/** The default deposits of A16. */
export const DEPOSITS = {
  deposits: [
    { borrower_type: 'association', amount: '150.00' },
    { borrower_type: 'individual', amount: '300.00' },
    { borrower_type: 'municipality', amount: '0.00' },
    { borrower_type: 'committee', amount: '0.00' },
  ],
} as const

/** A fictitious loan of two marquees to the football club, confirmed. */
export function loanOut(changes: Partial<LoanOut> = {}): LoanOut {
  return {
    id: 20,
    number: 'P-2026-020',
    borrower_type: 'association',
    borrower_name: 'Club de football',
    display_name: 'Club de football',
    purpose: 'Tournoi jeunes',
    phone: '01 23 45 67 89',
    start_date: '2026-10-16',
    end_date: '2026-10-18',
    status: 'confirmed',
    state: 'confirmed',
    deposit_amount: '150.00',
    event: null,
    notes: '',
    lines: [{ id: 41, equipment: { id: 5, name: 'Barnums 3 × 3 m', unit_value: '250.00' }, quantity: 2, damaged_quantity: 0, missing_quantity: 0 }],
    created_by: null,
    created_at: '2026-10-01T08:00:00Z',
    returned_at: null,
    ...changes,
  }
}
