import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'
import type { Option } from '~/utils/event-form'

type EquipmentCategory = components['schemas']['EquipmentCategory']
type EquipmentIn = components['schemas']['EquipmentIn']
type EquipmentOut = components['schemas']['EquipmentOut']

/** The Matériel page: the inventory, and the panel of an equipment. */
export const EQUIPMENT_PATH = '/bureau/materiel'

interface CategoryLook {
  /** « Barnums », on its chip and in the form. */
  label: string
  /** The word of the address: `?categorie=barnums`. */
  slug: string
}

/** What each category shows, in the order of the chips. */
export const EQUIPMENT_CATEGORIES: Readonly<Record<EquipmentCategory, CategoryLook>> = {
  furniture: { label: 'Mobilier', slug: 'mobilier' },
  marquees: { label: 'Barnums', slug: 'barnums' },
  sound_and_light: { label: 'Son et lumière', slug: 'son-et-lumiere' },
  kitchen: { label: 'Cuisine', slug: 'cuisine' },
  street_and_games: { label: 'Voirie et jeux', slug: 'voirie-et-jeux' },
}

// Object.keys() types its keys as strings: they are those of the record.
export const EQUIPMENT_CATEGORY_VALUES = Object.keys(EQUIPMENT_CATEGORIES) as EquipmentCategory[]

/** The categories to choose from, in the order of the chips. */
export const EQUIPMENT_CATEGORY_OPTIONS: readonly Option<EquipmentCategory>[] = EQUIPMENT_CATEGORY_VALUES.map(
  category => ({ value: category, label: EQUIPMENT_CATEGORIES[category].label }),
)

/** The word of the address that opens the form of a new equipment. */
const NEW = 'nouveau'

/** What the address of the Matériel page holds. */
export interface InventoryQuery {
  /** The equipment the panel shows, or `new` for the form that adds one. */
  equipment: number | 'new' | null
  category: EquipmentCategory | null
}

/**
 * What an address of the Matériel page asks for: `?materiel=12&categorie=barnums`,
 * or `?materiel=nouveau`. A value the page does not know is left out.
 */
export function parseInventoryQuery(query: LocationQuery): InventoryQuery {
  const id = Number(query.materiel)
  return {
    equipment: query.materiel === NEW ? 'new' : Number.isInteger(id) && id > 0 ? id : null,
    category: EQUIPMENT_CATEGORY_VALUES.find(category => EQUIPMENT_CATEGORIES[category].slug === query.categorie) ?? null,
  }
}

/** The address of the Matériel page, in the form parseInventoryQuery() reads. */
export function inventoryQuery({ equipment, category }: InventoryQuery): LocationQueryRaw {
  return {
    materiel: equipment === null ? undefined : equipment === 'new' ? NEW : String(equipment),
    categorie: category === null ? undefined : EQUIPMENT_CATEGORIES[category].slug,
  }
}

/** The address of an equipment, its panel open in the Matériel page. */
export function equipmentLocation(id: number): RouteLocationRaw {
  return { path: EQUIPMENT_PATH, query: { materiel: String(id) } }
}

/** « 1 référence », « 14 références · 3 en partie prêtées aujourd’hui · 5 pièces en réparation ». */
export function inventoryFigures(totals: components['schemas']['InventoryTotalsOut']): string {
  const references = `${totals.references} ${totals.references > 1 ? 'références' : 'référence'}`
  const taken = `${totals.taken_today} en partie ${totals.taken_today > 1 ? 'prêtées' : 'prêtée'} aujourd’hui`
  const repair = `${totals.pieces_under_repair} ${totals.pieces_under_repair > 1 ? 'pièces' : 'pièce'} en réparation`
  return [references, taken, repair].join(' · ')
}

/**
 * What the equipment form edits. The quantities and the value are texts, as
 * their fields hold them; the value is empty when it is not known.
 */
export interface EquipmentFields {
  name: string
  category: EquipmentCategory | ''
  storageLocation: string
  total: string
  repair: string
  unitValue: string
  repairNote: string
}

/** The fields of a new equipment: one piece, none under repair. */
export function newEquipmentFields(category: EquipmentCategory | null): EquipmentFields {
  return { name: '', category: category ?? '', storageLocation: '', total: '1', repair: '0', unitValue: '', repairNote: '' }
}

/** The fields of an equipment to change, as the API gave it. */
export function equipmentFields(equipment: EquipmentOut): EquipmentFields {
  return {
    name: equipment.name,
    category: equipment.category,
    storageLocation: equipment.storage_location,
    total: String(equipment.total_quantity),
    repair: String(equipment.repair_quantity),
    unitValue: equipment.unit_value === null ? '' : equipment.unit_value.replace('.', ','),
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
    // An empty category is no category: the API refuses it under its field.
    category: fields.category as EquipmentCategory,
    storage_location: fields.storageLocation,
    total_quantity: quantity(fields.total),
    repair_quantity: quantity(fields.repair),
    unit_value: amountInput(fields.unitValue),
    repair_note: fields.repairNote,
  }
}

const EQUIPMENT_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nom',
  category: 'Catégorie',
  storage_location: 'Rangement',
  total_quantity: 'Quantité totale',
  repair_quantity: 'En réparation',
  unit_value: 'Valeur de remplacement',
  repair_note: 'Note de réparation',
}

/** The name of a field of an equipment, for an error the form cannot show under it. */
export function equipmentFieldLabel(path: string): string {
  return EQUIPMENT_FIELD_LABELS[path] ?? path
}
