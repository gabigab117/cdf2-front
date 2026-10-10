import type { LocationQuery, LocationQueryRaw } from 'vue-router'

/** The sections of an event's page in the board space, each in its tab. */
export type EventTab = 'notes' | 'tasks' | 'stations' | 'reservations' | 'equipment' | 'documents' | 'public'

// The tabs as the address writes them: `?onglet=infos-publiques`. The notes,
// first, need nothing.
const TAB_SLUGS: Readonly<Record<Exclude<EventTab, 'notes'>, string>> = {
  tasks: 'taches',
  stations: 'postes',
  reservations: 'reservations',
  equipment: 'materiel',
  documents: 'documents',
  public: 'infos-publiques',
}

/** The tab and the page of its list an address of an event's page shows. */
export interface EventPageQuery {
  tab: EventTab
  page: number
}

/**
 * The tab an address asks for, and the page of its list: `?onglet=taches&page=2`.
 * The notes and the first page need nothing; a value the page does not know
 * falls back on them.
 */
export function parseEventPageQuery(query: LocationQuery): EventPageQuery {
  const page = Number(query.page)
  // Object.keys() types its keys as strings: they are those of the record.
  const tabs = Object.keys(TAB_SLUGS) as Array<keyof typeof TAB_SLUGS>
  return {
    tab: tabs.find(tab => TAB_SLUGS[tab] === query.onglet) ?? 'notes',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** The address of a tab and of a page of its list, in the form parseEventPageQuery() reads. */
export function eventPageQuery({ tab, page }: EventPageQuery): LocationQueryRaw {
  return {
    onglet: tab === 'notes' ? undefined : TAB_SLUGS[tab],
    page: page > 1 ? String(page) : undefined,
  }
}
