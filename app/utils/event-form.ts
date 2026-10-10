import type { components } from '~/types/api'

type EventIn = components['schemas']['EventIn']
type EventOut = components['schemas']['EventOut']
type EventItemOut = components['schemas']['EventItemOut']
type BoardMemberOut = components['schemas']['BoardMemberOut']
type EventCategory = components['schemas']['EventCategory']
type PracticalInfoIcon = components['schemas']['PracticalInfoIcon']

/** An option of a select. */
export interface Option<T> {
  value: T
  label: string
}

// Object.entries() types the keys of a record as mere strings.

/** The categories to choose from, in the order of the agenda. */
export const CATEGORY_OPTIONS: readonly Option<EventCategory>[] = Object.entries(EVENT_CATEGORIES).map(
  ([value, label]) => ({ value: value as EventCategory, label }),
)

/** The icons a « Bon à savoir » card may take. */
export const ICON_OPTIONS: readonly Option<PracticalInfoIcon>[] = Object.entries(PRACTICAL_INFO_ICONS).map(
  ([value, { label }]) => ({ value: value as PracticalInfoIcon, label }),
)

/** The general information of an event: what « Créer » and « Modifier » edit. */
const GENERAL_INFO_KEYS = [
  'title',
  'slug',
  'category',
  'starts_at',
  'ends_at',
  'start_label',
  'venue_name',
  'lead',
  'previous_edition',
] as const

type GeneralInfoKey = typeof GENERAL_INFO_KEYS[number]

/** Everything else, which the « Infos publiques » tab edits. */
type PublicInfoKey = Exclude<keyof EventIn, GeneralInfoKey>

/** The fields of the general information, named after the keys of the API. */
export interface GeneralInfoFields {
  title: string
  slug: string
  category: EventCategory | ''
  /** A date and time field: "2026-10-31T15:00", in Paris. */
  starts_at: string
  /** Empty for an event without an end. */
  ends_at: string
  start_label: string
  venue_name: string
  lead: number | null
  previous_edition: number | null
}

/** A line of the programme, or of « Bon à savoir », while the board edits it. */
type Line<T> = T & {
  /** Keeps a line's fields with it as it moves up or down the list. */
  key: number
}

export type ProgrammeLine = Line<{ time: string, title: string, description: string }>
export type PracticalInfoLine = Line<{ icon: PracticalInfoIcon, title: string, text: string }>

/** The fields of the public information, named after the keys of the API. */
export interface PublicInfoFields {
  published: boolean
  summary: string
  venue_address: string
  /** Typed as text, with a comma or a point: "49,42". */
  latitude: string
  longitude: string
  price_label: string
  price_detail: string
  programme: ProgrammeLine[]
  practical_infos: PracticalInfoLine[]
}

/** The labels of the fields, which also name them in an error moved to the form. */
export const EVENT_FIELD_LABELS: Readonly<Record<keyof EventIn, string>> = {
  title: 'Titre',
  slug: 'Adresse de la page',
  category: 'Catégorie',
  starts_at: 'Début',
  ends_at: 'Fin',
  start_label: 'Libellé du début',
  venue_name: 'Lieu',
  lead: 'Responsable',
  previous_edition: 'Édition précédente',
  published: 'Publié sur le site',
  summary: 'Chapeau',
  venue_address: 'Adresse du lieu',
  latitude: 'Latitude',
  longitude: 'Longitude',
  price_label: 'Tarif',
  price_detail: 'Précision sur le tarif',
  programme: 'Au programme',
  practical_infos: 'Bon à savoir',
}

function isEventField(name: string): name is keyof EventIn {
  return Object.hasOwn(EVENT_FIELD_LABELS, name)
}

/** The name of a field of the event, a line's included: « Au programme, ligne 3 ». */
export function eventFieldLabel(path: string): string {
  const [name = '', index] = path.split('.')
  const label = isEventField(name) ? EVENT_FIELD_LABELS[name] : name
  return index === undefined ? label : `${label}, ligne ${Number(index) + 1}`
}

/** The fields the general information form shows its errors under. */
export const GENERAL_INFO_PATHS: ReadonlySet<string> = new Set(GENERAL_INFO_KEYS)

/**
 * The fields the « Infos publiques » form shows its errors under: its own and
 * those of each line it holds. The switch shows none: an error about the
 * publication goes to the form.
 */
export function publicInfoPaths({ programme, practical_infos }: PublicInfoFields): ReadonlySet<string> {
  return new Set([
    'summary',
    'venue_address',
    'latitude',
    'longitude',
    'price_label',
    'price_detail',
    ...programme.flatMap((_, index) => ['time', 'title', 'description'].map(name => `programme.${index}.${name}`)),
    ...practical_infos.flatMap((_, index) => ['icon', 'title', 'text'].map(name => `practical_infos.${index}.${name}`)),
  ])
}

// Only the lines of a page need tell one another apart: a count serves.
let lastLineKey = 0

/** A key for a line the board adds. */
export function newLineKey(): number {
  lastLineKey += 1
  return lastLineKey
}

/** The general information of an event, or empty fields for a new one. */
export function generalInfoFields(event?: EventOut): GeneralInfoFields {
  return {
    title: event?.title ?? '',
    slug: event?.slug ?? '',
    category: event?.category ?? '',
    starts_at: event ? toDateTimeInput(event.starts_at) : '',
    ends_at: event?.ends_at ? toDateTimeInput(event.ends_at) : '',
    start_label: event?.start_label ?? '',
    venue_name: event?.venue_name ?? '',
    lead: event?.lead?.id ?? null,
    previous_edition: event?.previous_edition?.id ?? null,
  }
}

function coordinateText(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}

/** The public information of an event. */
export function publicInfoFields(event: EventOut): PublicInfoFields {
  return {
    published: event.published,
    summary: event.summary,
    venue_address: event.venue_address,
    latitude: coordinateText(event.latitude),
    longitude: coordinateText(event.longitude),
    price_label: event.price_label,
    price_detail: event.price_detail,
    // The API gives the time to the second, the field to the minute.
    programme: event.programme.map(line => ({ ...line, time: line.time.slice(0, 5), key: newLineKey() })),
    practical_infos: event.practical_infos.map(line => ({ ...line, key: newLineKey() })),
  }
}

/**
 * The event as the API gave it, in the shape it is written back: the half a
 * form does not edit goes back exactly as it came, never read again from
 * fields that would lose its seconds.
 */
export function receivedEventIn(event: EventOut): EventIn {
  return {
    title: event.title,
    slug: event.slug,
    category: event.category,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    start_label: event.start_label,
    venue_name: event.venue_name,
    venue_address: event.venue_address,
    latitude: event.latitude,
    longitude: event.longitude,
    price_label: event.price_label,
    price_detail: event.price_detail,
    summary: event.summary,
    published: event.published,
    lead: event.lead?.id ?? null,
    previous_edition: event.previous_edition?.id ?? null,
    programme: event.programme.map(({ time, title, description }) => ({ time, title, description })),
    practical_infos: event.practical_infos.map(({ icon, title, text }) => ({ icon, title, text })),
  }
}

/** The public information of a new event: nothing yet, and not published. */
export const NEW_EVENT_PUBLIC_INFO: Readonly<Pick<EventIn, PublicInfoKey>> = {
  published: false,
  summary: '',
  venue_address: '',
  latitude: null,
  longitude: null,
  price_label: '',
  price_detail: '',
  programme: [],
  practical_infos: [],
}

/**
 * The general information to send, once a category is chosen: the dates take
 * Paris's offset, an empty end or choice none.
 */
export function generalInfoPayload(fields: GeneralInfoFields & { category: EventCategory }): Pick<EventIn, GeneralInfoKey> {
  return {
    title: fields.title,
    slug: fields.slug,
    category: fields.category,
    starts_at: fromDateTimeInput(fields.starts_at),
    ends_at: fields.ends_at ? fromDateTimeInput(fields.ends_at) : null,
    start_label: fields.start_label,
    venue_name: fields.venue_name,
    lead: fields.lead,
    previous_edition: fields.previous_edition,
  }
}

// A coordinate typed with a comma, as French writes decimals. The field's
// pattern lets nothing else through.
function coordinate(text: string): number | null {
  const value = text.trim().replace(',', '.')
  return value === '' ? null : Number(value)
}

/** The public information to send, its lines in the order the board gave them. */
export function publicInfoPayload(fields: PublicInfoFields): Pick<EventIn, PublicInfoKey> {
  return {
    published: fields.published,
    summary: fields.summary,
    venue_address: fields.venue_address,
    latitude: coordinate(fields.latitude),
    longitude: coordinate(fields.longitude),
    price_label: fields.price_label,
    price_detail: fields.price_detail,
    programme: fields.programme.map(({ time, title, description }) => ({ time, title, description })),
    practical_infos: fields.practical_infos.map(({ icon, title, text }) => ({ icon, title, text })),
  }
}

/**
 * The board members to choose from, by name, after the choice of nobody
 * (« Aucun », « Personne »): the lead of an event, the assignee of a task. The
 * member chosen so far stays among them, even after leaving the board:
 * otherwise, saving would take them off without anyone choosing so.
 */
export function memberOptions(
  members: readonly BoardMemberOut[],
  current: BoardMemberOut | null,
  nobody: string,
): Option<number | null>[] {
  const chosen = current && !members.some(member => member.id === current.id) ? [...members, current] : members
  return [
    { value: null, label: nobody },
    ...chosen.map(member => ({ value: member.id, label: memberName(member) })),
  ]
}

/**
 * The past events that may be the previous edition, after « Aucune »: the
 * current one stays among them, and the event itself never is.
 */
export function previousEditionOptions(
  pastEvents: readonly EventItemOut[],
  previous: EventItemOut | null,
  eventId: number | null,
): Option<number | null>[] {
  const { day } = useDateFormat()
  const editions = previous && !pastEvents.some(event => event.id === previous.id)
    ? [...pastEvents, previous]
    : pastEvents
  return [
    { value: null, label: 'Aucune' },
    ...editions
      .filter(event => event.id !== eventId)
      .map(event => ({ value: event.id, label: `${event.title} · ${day(event.starts_at, { weekday: false, year: true })}` })),
  ]
}
