import type { components } from '~/types/api'

type StationOut = components['schemas']['StationOut']
type StationBoardOut = components['schemas']['StationBoardOut']

/** The bar of an event: two people required, Alice for the beer only. */
export function boardStation(changes: Partial<StationOut> = {}): StationOut {
  return {
    id: 61,
    name: 'Buvette',
    description: 'Bière et soft.',
    required_count: 2,
    assigned_count: 1,
    complete: false,
    assignments: [{ id: 71, name: 'Alice', role: 'bière uniquement' }],
    ...changes,
  }
}

/** The stations of an event: the bar, then the till, complete. */
export function stationBoard(changes: Partial<StationBoardOut> = {}): StationBoardOut {
  return {
    stations: [
      boardStation(),
      boardStation({ id: 62, name: 'Caisse', description: '', required_count: 1, complete: true, assignments: [{ id: 72, name: 'Bob', role: '' }] }),
    ],
    required_count: 3,
    assigned_count: 2,
    open_places: 1,
    complete: false,
    ...changes,
  }
}
