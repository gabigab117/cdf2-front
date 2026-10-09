import { Accessibility, Check, House, Info, SquareParking, TriangleAlert, Users, Utensils } from '@lucide/vue'
import type { Component } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { components } from '~/types/api'

type EventCategory = components['schemas']['EventCategory']
type PracticalInfoIcon = components['schemas']['PracticalInfoIcon']

/** The board's list of events. */
export const EVENTS_PATH = '/bureau/evenements'

/** Where the board creates an event. */
export const NEW_EVENT_PATH = `${EVENTS_PATH}/nouveau`

/** The board's page of an event. */
export function eventPath(id: number): string {
  return `${EVENTS_PATH}/${id}`
}

/** Where the board changes the general information of an event. */
export function eventEditPath(id: number): string {
  return `${eventPath(id)}/modifier`
}

/** How many events a page of the board's list holds. */
export const EVENTS_PAGE_SIZE = 25

/** The categories of the events (A10), in the order of the agenda. The API only knows their keys. */
export const EVENT_CATEGORIES: Readonly<Record<EventCategory, string>> = {
  children: 'Enfants',
  meals: 'Repas',
  markets: 'Marchés',
  games: 'Jeux',
  festivities: 'Fêtes',
}

/** The icons a « Bon à savoir » card may take, with what each one shows. */
export const PRACTICAL_INFO_ICONS: Readonly<Record<PracticalInfoIcon, { label: string, icon: Component }>> = {
  people: { label: 'Personnes', icon: Users },
  home: { label: 'Maison', icon: House },
  check: { label: 'Coche', icon: Check },
  info: { label: 'Information', icon: Info },
  warning: { label: 'Attention', icon: TriangleAlert },
  parking: { label: 'Stationnement', icon: SquareParking },
  food: { label: 'Restauration', icon: Utensils },
  accessibility: { label: 'Accessibilité', icon: Accessibility },
}

/** The page of the board's list of events an address shows. */
export interface EventListQuery {
  period: 'upcoming' | 'past'
  page: number
}

/**
 * The page of the list an address asks for: `?periode=passes&page=2`. Upcoming
 * events and the first page need nothing; a value the list does not know
 * falls back on them.
 */
export function parseEventListQuery(query: LocationQuery): EventListQuery {
  const page = Number(query.page)
  return {
    period: query.periode === 'passes' ? 'past' : 'upcoming',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** The address of a page of the list, in the form parseEventListQuery() reads. */
export function eventListQuery({ period, page }: EventListQuery): LocationQueryRaw {
  return {
    periode: period === 'past' ? 'passes' : undefined,
    page: page > 1 ? String(page) : undefined,
  }
}
