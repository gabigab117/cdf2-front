import { describe, expect, it } from 'vitest'
import { boardEvent, eventItem, julie } from '../helpers/events'

describe('the general information of an event', () => {
  it('starts empty for a new event', () => {
    expect(generalInfoFields()).toEqual({
      title: '',
      slug: '',
      category: '',
      starts_at: '',
      ends_at: '',
      start_label: '',
      venue_name: '',
      lead: null,
      previous_edition: null,
    })
  })

  it('shows the dates of an event in Paris, to the minute', () => {
    const fields = generalInfoFields(boardEvent({ previous_edition: eventItem({ id: 3 }) }))

    expect(fields).toMatchObject({
      starts_at: '2026-10-31T15:00',
      ends_at: '2026-10-31T18:30',
      lead: julie.id,
      previous_edition: 3,
    })
  })

  it('leaves the end empty for an event without one', () => {
    expect(generalInfoFields(boardEvent({ ends_at: null })).ends_at).toBe('')
  })

  it('sends the dates with Paris\'s offset, and an empty end as none', () => {
    const fields = { ...generalInfoFields(boardEvent()), category: 'children' as const, ends_at: '' }

    expect(generalInfoPayload(fields)).toMatchObject({
      starts_at: '2026-10-31T15:00:00+01:00',
      ends_at: null,
      lead: julie.id,
    })
  })
})

describe('the public information of an event', () => {
  it('shows the coordinates with a comma, and the times to the minute', () => {
    const fields = publicInfoFields(boardEvent())

    expect(fields).toMatchObject({ latitude: '49,42', longitude: '1,98' })
    expect(fields.programme.map(line => line.time)).toEqual(['15:00', '17:00'])
  })

  it('tells its lines apart, even once moved', () => {
    const { programme, practical_infos } = publicInfoFields(boardEvent())

    const keys = [...programme, ...practical_infos].map(line => line.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('sends the coordinates as numbers, the lines in the order given, without their keys', () => {
    const fields = publicInfoFields(boardEvent())
    fields.latitude = ' 49,4183 '
    fields.longitude = ''
    fields.programme.reverse()

    const payload = publicInfoPayload(fields)

    expect(payload).toMatchObject({ latitude: 49.4183, longitude: null })
    expect(payload.programme).toEqual([
      { time: '17:00', title: 'Goûter', description: '' },
      { time: '15:00', title: 'Accueil et maquillage', description: 'Salle des fêtes.' },
    ])
  })
})

describe('the event as the API gave it', () => {
  it('goes back exactly as it came', () => {
    /**
     * Given an event whose half the form does not edit
     * Then that half is written back as the API gave it, seconds included
     */
    const event = boardEvent({ starts_at: '2026-10-31T14:00:30Z', previous_edition: eventItem({ id: 3 }) })

    expect(receivedEventIn(event)).toEqual({
      title: 'Halloween des enfants',
      slug: 'halloween-des-enfants-2026',
      category: 'children',
      starts_at: '2026-10-31T14:00:30Z',
      ends_at: '2026-10-31T17:30:00Z',
      start_label: '',
      venue_name: 'Salle des fêtes',
      venue_address: '1 place de la Mairie',
      latitude: 49.42,
      longitude: 1.98,
      price_label: 'Gratuit',
      price_detail: 'Goûter offert par le comité',
      summary: 'Défilé costumé, chasse aux bonbons, puis goûter.',
      published: true,
      lead: julie.id,
      previous_edition: 3,
      programme: [
        { time: '15:00:00', title: 'Accueil et maquillage', description: 'Salle des fêtes.' },
        { time: '17:00:00', title: 'Goûter', description: '' },
      ],
      practical_infos: [{ icon: 'people', title: 'Enfants accompagnés', text: 'Un adulte par groupe.' }],
    })
  })
})

describe('the options of the selects', () => {
  const alain = { id: 8, first_name: 'Alain', last_name: 'Petit', email: 'alain.petit@example.test' }

  it('offers the board members by name, after the choice of nobody', () => {
    const nameless = { id: 9, first_name: '', last_name: '', email: 'tresorerie@example.test' }

    expect(memberOptions([alain, nameless], null, 'Aucun')).toEqual([
      { value: null, label: 'Aucun' },
      { value: 8, label: 'Alain Petit' },
      { value: 9, label: 'tresorerie@example.test' },
    ])
  })

  it('keeps among them a member chosen before who has left the board, once', () => {
    /**
     * Given an event led by a member no longer on the board
     * Then they stay among the leads to choose from, or saving would take
     * them off the event
     */
    expect(memberOptions([alain], julie, 'Aucun').map(option => option.value)).toEqual([null, 8, 7])
    expect(memberOptions([alain, julie], julie, 'Personne').map(option => option.value)).toEqual([null, 8, 7])
  })

  it('offers the past events by title and date, after « Aucune », never the event itself', () => {
    const lastYear = eventItem({ id: 3, starts_at: '2025-10-31T14:00:00Z' })
    const itself = eventItem({ id: 12 })

    expect(previousEditionOptions([lastYear, itself], null, 12)).toEqual([
      { value: null, label: 'Aucune' },
      { value: 3, label: 'Halloween des enfants · 31 oct. 2025' },
    ])
  })

  it('keeps among them the current previous edition', () => {
    const older = eventItem({ id: 2, title: 'Halloween', starts_at: '2019-10-31T14:00:00Z' })

    expect(previousEditionOptions([], older, 12)).toEqual([
      { value: null, label: 'Aucune' },
      { value: 2, label: 'Halloween · 31 oct. 2019' },
    ])
  })

  it('offers the categories and the icons by their label', () => {
    expect(CATEGORY_OPTIONS.map(option => option.label)).toEqual(['Enfants', 'Repas', 'Marchés', 'Jeux', 'Fêtes'])
    expect(ICON_OPTIONS).toContainEqual({ value: 'parking', label: 'Stationnement' })
  })
})

describe('the fields of the forms', () => {
  it.each([
    ['slug', 'Adresse de la page'],
    ['programme.2.title', 'Au programme, ligne 3'],
    ['practical_infos.0.text', 'Bon à savoir, ligne 1'],
    ['unknown', 'unknown'],
  ])('names %s', (path, label) => {
    expect(eventFieldLabel(path)).toBe(label)
  })

  it('shows the errors of the public information under its fields and lines, not under the switch', () => {
    const paths = publicInfoPaths(publicInfoFields(boardEvent()))

    expect(paths).toContain('programme.1.title')
    expect(paths).toContain('practical_infos.0.icon')
    expect(paths).not.toContain('programme.2.title')
    expect(paths).not.toContain('published')
    expect(paths).not.toContain('slug')
  })
})
