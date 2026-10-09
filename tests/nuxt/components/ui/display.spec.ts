import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import UiAvatar from '~/components/ui/Avatar.vue'
import UiField from '~/components/ui/Field.vue'
import UiKpiCard from '~/components/ui/KpiCard.vue'
import UiProgressBar from '~/components/ui/ProgressBar.vue'
import UiSidePanel from '~/components/ui/SidePanel.vue'
import UiStackedBar from '~/components/ui/StackedBar.vue'

describe('UiProgressBar', () => {
  it('tells how far along it is', async () => {
    const bar = await mountSuspended(UiProgressBar, { props: { value: 9, max: 14, label: 'Tâches faites' } })

    expect(bar.attributes()).toMatchObject({
      'role': 'progressbar',
      'aria-label': 'Tâches faites',
      'aria-valuenow': '9',
      'aria-valuemax': '14',
    })
  })

  it.each([
    ['past its end', 20, '14', '100%'],
    ['below its start', -3, '0', '0%'],
  ])('never runs %s', async (_case, value, valueNow, width) => {
    const bar = await mountSuspended(UiProgressBar, { props: { value, max: 14, label: 'Tâches faites' } })

    expect(bar.attributes('aria-valuenow')).toBe(valueNow)
    expect(bar.get('[style]').attributes('style')).toBe(`width: ${width};`)
  })
})

describe('UiStackedBar', () => {
  it('reads as a sentence, and draws only the shares that exist', async () => {
    const bar = await mountSuspended(UiStackedBar, {
      props: {
        label: 'Barnums',
        total: 12,
        segments: [
          { value: 9, label: 'disponibles', tone: 'azur' },
          { value: 3, label: 'sortis', tone: 'sable' },
          { value: 0, label: 'en réparation', tone: 'ambre' },
        ],
      },
    })

    expect(bar.attributes('aria-label')).toBe('Barnums : 9 disponibles, 3 sortis, 0 en réparation, sur 12')
    expect(bar.findAll('span').map(part => part.attributes('style'))).toEqual(['width: 75%;', 'width: 25%;'])
  })
})

describe('UiAvatar', () => {
  it.each([
    ['a full name', 'Camille Martin', 'CM'],
    ['a compound first name', 'Jean-Pierre Dupont', 'JD'],
    ['a single name', 'Camille', 'C'],
    ['an e-mail address', 'camille.martin@example.test', 'CM'],
  ])('shows the initials of %s', async (_case, name, initials) => {
    const avatar = await mountSuspended(UiAvatar, { props: { name } })

    expect(avatar.text()).toBe(initials)
    expect(avatar.attributes('aria-hidden')).toBe('true')
  })
})

describe('UiField', () => {
  it('ties its control to its label, help and errors', async () => {
    /**
     * Given a field with a help text and an error from the API
     * Then the control is named by the label, described by both texts, and
     * marked invalid
     */
    const field = await mountSuspended(UiField, {
      props: { label: 'Montant', help: 'TTC, en euros.', errors: ['Le montant doit être positif.'] },
      slots: {
        default: ({ id, describedby, invalid }: { id: string, describedby?: string, invalid: boolean }) =>
          h('input', { 'id': id, 'aria-describedby': describedby, 'aria-invalid': invalid }),
      },
    })

    const input = field.find('input')
    const [helpId, errorId] = input.attributes('aria-describedby')?.split(' ') ?? []
    expect(field.find('label').attributes('for')).toBe(input.attributes('id'))
    expect(field.find(`#${helpId}`).text()).toBe('TTC, en euros.')
    expect(field.find(`#${errorId}`).text()).toContain('Le montant doit être positif.')
    expect(input.attributes('aria-invalid')).toBe('true')
  })

  it('says when it may stay empty', async () => {
    const field = await mountSuspended(UiField, { props: { label: 'Note', optional: true } })

    expect(field.find('label').text()).toBe('Note (facultatif)')
  })
})

describe('UiKpiCard', () => {
  it('links to the page its figure sums up', async () => {
    const card = await mountSuspended(UiKpiCard, {
      props: { label: 'Matériel prêté', value: '1 en cours', to: '/bureau/prets' },
    })

    expect(card.element.tagName).toBe('A')
    expect(card.attributes('href')).toBe('/bureau/prets')
    expect(card.text()).toContain('1 en cours')
  })
})

describe('UiSidePanel', () => {
  it('is named by its title, and asks to be closed', async () => {
    const panel = await mountSuspended(UiSidePanel, { props: { title: 'Location sono', closable: true } })

    await panel.get('button[aria-label="Fermer le panneau"]').trigger('click')

    expect(panel.attributes('aria-label')).toBe('Location sono')
    expect(panel.emitted('close')).toHaveLength(1)
  })
})
