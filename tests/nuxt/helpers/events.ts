import type { components } from '~/types/api'

type EventItemOut = components['schemas']['EventItemOut']
type EventOut = components['schemas']['EventOut']
type BoardMemberOut = components['schemas']['BoardMemberOut']

/** A fictitious board member. */
export const julie: BoardMemberOut = {
  id: 7,
  first_name: 'Julie',
  last_name: 'Roux',
  email: 'julie.roux@example.test',
}

/** An event as the lists show it: Halloween, on Saturday 31 October 2026, 15:00–18:30 in Paris. */
export function eventItem(changes: Partial<EventItemOut> = {}): EventItemOut {
  return {
    id: 12,
    title: 'Halloween des enfants',
    slug: 'halloween-des-enfants-2026',
    category: 'children',
    starts_at: '2026-10-31T14:00:00Z',
    ends_at: '2026-10-31T17:30:00Z',
    start_label: '',
    venue_name: 'Salle des fêtes',
    published: true,
    ...changes,
  }
}

/** The same event with all its content, as its page shows it. */
export function boardEvent(changes: Partial<EventOut> = {}): EventOut {
  return {
    ...eventItem(),
    venue_address: '1 place de la Mairie',
    latitude: 49.42,
    longitude: 1.98,
    price_label: 'Gratuit',
    price_detail: 'Goûter offert par le comité',
    summary: 'Défilé costumé, chasse aux bonbons, puis goûter.',
    lead: julie,
    previous_edition: null,
    programme: [
      { time: '15:00:00', title: 'Accueil et maquillage', description: 'Salle des fêtes.' },
      { time: '17:00:00', title: 'Goûter', description: '' },
    ],
    practical_infos: [{ icon: 'people', title: 'Enfants accompagnés', text: 'Un adulte par groupe.' }],
    updated_at: '2026-10-01T08:00:00Z',
    ...changes,
  }
}

/** A page of a collection, as the API answers it. */
export function page<T>(items: T[], count = items.length): { items: T[], count: number } {
  return { items, count }
}

type PublicEventItemOut = components['schemas']['PublicEventItemOut']
type PublicEventOut = components['schemas']['PublicEventOut']

/** An event of the agenda, as the site lists it: Halloween, on Saturday 31 October 2026, 15:00–18:30 in Paris. */
export function publicEventItem(changes: Partial<PublicEventItemOut> = {}): PublicEventItemOut {
  return {
    slug: 'halloween-des-enfants-2026',
    title: 'Halloween des enfants',
    category: 'children',
    starts_at: '2026-10-31T14:00:00Z',
    ends_at: '2026-10-31T17:30:00Z',
    start_label: '',
    venue_name: 'Salle des fêtes',
    price_label: 'Gratuit',
    price_detail: 'Goûter offert par le comité',
    ...changes,
  }
}

/** The Loto, the event after Halloween in the agenda. */
export const loto = publicEventItem({
  slug: 'loto-d-automne-2026',
  title: 'Loto d’automne',
  category: 'games',
  starts_at: '2026-11-15T12:00:00Z',
  ends_at: null,
  start_label: 'Ouverture',
  price_label: '3 € le carton',
  price_detail: '',
})

/** The same event with all its content, as its public page shows it. */
export function publicEvent(changes: Partial<PublicEventOut> = {}): PublicEventOut {
  return {
    ...publicEventItem(),
    venue_address: '1 place de la Mairie',
    latitude: 46.5397,
    longitude: 2.43,
    summary: 'Défilé costumé, chasse aux bonbons, puis goûter.',
    programme: [
      { time: '15:00:00', title: 'Accueil et maquillage', description: 'Salle des fêtes.' },
      { time: '17:00:00', title: 'Goûter', description: '' },
    ],
    practical_infos: [{ icon: 'people', title: 'Enfants accompagnés', text: 'Un adulte par groupe.' }],
    next_events: [loto],
    ...changes,
  }
}
