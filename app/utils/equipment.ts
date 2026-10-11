import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { components } from '~/types/api'

type EquipmentIn = components['schemas']['EquipmentIn']
type EquipmentOut = components['schemas']['EquipmentOut']

/** The Matériel page: the inventory, and the panel of an equipment. */
export const EQUIPMENT_PATH = '/bureau/materiel'

/** The word of the address that opens the form of a new equipment. */
const NEW = 'nouveau'

/** What the address of the Matériel page holds. */
export interface InventoryQuery {
  /** The equipment the panel shows, or `new` for the form that adds one. */
  equipment: number | 'new' | null
}

/**
 * What an address of the Matériel page asks for: `?materiel=12`, or
 * `?materiel=nouveau`. A value the page does not know is left out.
 */
export function parseInventoryQuery(query: LocationQuery): InventoryQuery {
  const id = Number(query.materiel)
  return { equipment: query.materiel === NEW ? 'new' : Number.isInteger(id) && id > 0 ? id : null }
}

/** The address of the Matériel page, in the form parseInventoryQuery() reads. */
export function inventoryQuery({ equipment }: InventoryQuery): LocationQueryRaw {
  return { materiel: equipment === null ? undefined : equipment === 'new' ? NEW : String(equipment) }
}

/** « 1 référence », « 14 références · 3 en partie prêtées aujourd’hui · 5 pièces en réparation ». */
export function inventoryFigures(totals: components['schemas']['InventoryTotalsOut']): string {
  const references = `${totals.references} ${totals.references > 1 ? 'références' : 'référence'}`
  const taken = `${totals.taken_today} en partie ${totals.taken_today > 1 ? 'prêtées' : 'prêtée'} aujourd’hui`
  const repair = `${totals.pieces_under_repair} ${totals.pieces_under_repair > 1 ? 'pièces' : 'pièce'} en réparation`
  return [references, taken, repair].join(' · ')
}

/** What the equipment form edits. The quantities are texts, as their fields hold them. */
export interface EquipmentFields {
  name: string
  total: string
  repair: string
  repairNote: string
}

/** The fields of a new equipment: one piece, none under repair. */
export function newEquipmentFields(): EquipmentFields {
  return { name: '', total: '1', repair: '0', repairNote: '' }
}

/** The fields of an equipment to change, as the API gave it. */
export function equipmentFields(equipment: EquipmentOut): EquipmentFields {
  return {
    name: equipment.name,
    total: String(equipment.total_quantity),
    repair: String(equipment.repair_quantity),
    repairNote: equipment.repair_note,
  }
}

// A quantity left empty is no number: the API says what it lacks. Vue gives
// a number field's value as a number once it reads as one.
function quantity(text: string): number {
  const value = String(text).trim()
  return value === '' ? Number.NaN : Number(value)
}

/** The equipment to send, whole. */
export function equipmentPayload(fields: EquipmentFields): EquipmentIn {
  return {
    name: fields.name,
    total_quantity: quantity(fields.total),
    repair_quantity: quantity(fields.repair),
    repair_note: fields.repairNote,
  }
}

const EQUIPMENT_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nom',
  total_quantity: 'Quantité totale',
  repair_quantity: 'En réparation',
  repair_note: 'Note de réparation',
}

/** The name of a field of an equipment, for an error the form cannot show under it. */
export function equipmentFieldLabel(path: string): string {
  return EQUIPMENT_FIELD_LABELS[path] ?? path
}
