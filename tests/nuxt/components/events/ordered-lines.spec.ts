import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EventsOrderedLines from '~/components/events/OrderedLines.vue'

interface Line {
  key: number
  title: string
}

const lines: Line[] = [
  { key: 1, title: 'Accueil' },
  { key: 2, title: 'Défilé' },
  { key: 3, title: 'Goûter' },
]

function mountLines() {
  return mountSuspended(EventsOrderedLines<Line>, {
    props: { modelValue: lines, newLine: () => ({ key: 9, title: '' }), addLabel: 'Ajouter une ligne' },
    slots: { default: ({ line }: { line: Line }) => line.title },
  })
}

function titles(emitted: unknown[][] | undefined): string[] {
  return (emitted?.at(-1)?.[0] as Line[]).map(line => line.title)
}

describe('EventsOrderedLines', () => {
  it('names each line, for screen readers too', async () => {
    const list = await mountLines()

    const second = list.findAll('li')[1]!
    expect(second.attributes('role')).toBe('group')
    expect(list.get(`#${second.attributes('aria-labelledby')}`).text()).toBe('Ligne 2')
  })

  it.each([
    ['Monter : ligne 2', ['Défilé', 'Accueil', 'Goûter']],
    ['Descendre : ligne 2', ['Accueil', 'Goûter', 'Défilé']],
    ['Retirer : ligne 2', ['Accueil', 'Goûter']],
  ])('moves or takes away a line (%s), and says the lines changed places', async (label, expected) => {
    const list = await mountLines()

    await list.get(`button[aria-label="${label}"]`).trigger('click')

    expect(titles(list.emitted('update:modelValue'))).toEqual(expected)
    expect(list.emitted('restructured')).toHaveLength(1)
  })

  it('cannot move the first line up, nor the last one down', async () => {
    const list = await mountLines()

    expect(list.get('button[aria-label="Monter : ligne 1"]').attributes('disabled')).toBeDefined()
    expect(list.get('button[aria-label="Descendre : ligne 3"]').attributes('disabled')).toBeDefined()
    expect(list.get('button[aria-label="Descendre : ligne 2"]').attributes('disabled')).toBeUndefined()
  })

  it('adds a blank line at the end, the others staying in place', async () => {
    const list = await mountLines()

    await list.findAll('button').at(-1)!.trigger('click')

    expect(titles(list.emitted('update:modelValue'))).toEqual(['Accueil', 'Défilé', 'Goûter', ''])
    expect(list.emitted('restructured')).toBeUndefined()
  })
})
