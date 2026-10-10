import type { components } from '~/types/api'

type StationIn = components['schemas']['StationIn']
type StationOut = components['schemas']['StationOut']
type StationBoardOut = components['schemas']['StationBoardOut']

/** What the station form edits. A number field gives a text. */
export interface StationFields {
  name: string
  description: string
  requiredCount: string
}

/** The fields of a station to change, or of a new one: two people by default. */
export function stationFields(station?: StationOut): StationFields {
  return {
    name: station?.name ?? '',
    description: station?.description ?? '',
    requiredCount: String(station?.required_count ?? 2),
  }
}

/** The station to send. A count that is not a number is the API's to refuse. */
export function stationPayload(fields: StationFields): StationIn {
  return { name: fields.name, description: fields.description, required_count: Number(fields.requiredCount) }
}

const STATION_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nom du poste',
  description: 'Description',
  required_count: 'Personnes requises',
  role: 'Rôle',
  stations: 'Postes',
}

/** The name of a field of a station, for an error its form cannot show under it. */
export function stationFieldLabel(path: string): string {
  return STATION_FIELD_LABELS[path] ?? path
}

/** « 4 / 7 personnes affectées », as the v1 counts the volunteers of an event. */
export function staffing(board: Pick<StationBoardOut, 'assigned_count' | 'required_count'>): string {
  return `${board.assigned_count} / ${board.required_count} personnes affectées`
}

/** « 3 places à pourvoir », « 1 place à pourvoir ». */
export function openPlaces(count: number): string {
  return count === 1 ? '1 place à pourvoir' : `${count} places à pourvoir`
}

/** The ids of the stations, one of them moved up (-1) or down (+1) a place. */
export function movedStation(ids: readonly number[], index: number, step: -1 | 1): number[] {
  const order = [...ids]
  const [moved] = order.splice(index, 1)
  if (moved !== undefined) order.splice(index + step, 0, moved)
  return order
}

/**
 * How the former committee staffed its stations, from the v1: a reminder, not
 * a rule (card 3.3).
 */
export const FORMER_STAFFING: ReadonlyArray<{ station: string, people: string }> = [
  { station: 'Vélos', people: '2–3' },
  { station: 'Caisse', people: '2' },
  { station: 'Buvette (brocante)', people: '3' },
  { station: 'Buvette (13 juillet)', people: '4' },
  { station: 'BBQ', people: '3' },
  { station: 'Service', people: '2–3' },
  { station: 'Frites', people: '2' },
]
