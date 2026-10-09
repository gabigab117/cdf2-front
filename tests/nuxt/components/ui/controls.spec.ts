import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import UiButton from '~/components/ui/Button.vue'
import UiFilterChip from '~/components/ui/FilterChip.vue'
import UiSegmentedControl from '~/components/ui/SegmentedControl.vue'
import UiSelectableRow from '~/components/ui/SelectableRow.vue'
import UiStepper from '~/components/ui/Stepper.vue'

describe('UiButton', () => {
  it('becomes a link to the page it leads to', async () => {
    const button = await mountSuspended(UiButton, { props: { to: '/bureau/prets' }, slots: { default: () => 'Prêts' } })

    expect(button.element.tagName).toBe('A')
    expect(button.attributes('href')).toBe('/bureau/prets')
  })

  it('waits, unavailable, while its action is under way', async () => {
    /**
     * Given an action under way
     * Then the button can no longer be pressed, and says it is busy
     */
    const button = await mountSuspended(UiButton, { props: { type: 'submit', loading: true } })

    expect(button.attributes('type')).toBe('submit')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
  })
})

describe('UiFilterChip', () => {
  it.each([true, false])('tells whether its filter applies (%s)', async (pressed) => {
    const chip = await mountSuspended(UiFilterChip, { props: { pressed, count: 21 }, slots: { default: () => 'Factures' } })

    expect(chip.attributes('aria-pressed')).toBe(String(pressed))
    expect(chip.text()).toBe('Factures21')
  })
})

describe('UiSelectableRow', () => {
  it('tells which row is selected', async () => {
    const row = await mountSuspended(UiSelectableRow, { props: { selected: true } })

    expect(row.attributes('aria-pressed')).toBe('true')
  })
})

describe('UiSegmentedControl', () => {
  const options = [
    { value: 'expense', label: 'Dépense' },
    { value: 'income', label: 'Recette' },
  ] as const

  it('is a group of radio buttons, which the arrow keys move through', async () => {
    const control = await mountSuspended(UiSegmentedControl, {
      props: { modelValue: 'expense', options, label: 'Type de ligne' },
    })

    const radios = control.findAll('input[type="radio"]')
    expect(control.attributes('role')).toBe('radiogroup')
    expect(control.attributes('aria-label')).toBe('Type de ligne')
    expect(radios).toHaveLength(2)
    expect(new Set(radios.map(radio => radio.attributes('name'))).size).toBe(1)
    expect((radios[0]?.element as HTMLInputElement).checked).toBe(true)
  })

  it('reports the option chosen', async () => {
    const control = await mountSuspended(UiSegmentedControl, {
      props: { modelValue: 'expense', options, label: 'Type de ligne' },
    })

    await control.findAll('input[type="radio"]')[1]?.setValue(true)

    expect(control.emitted('update:modelValue')).toEqual([['income']])
  })
})

describe('UiStepper', () => {
  async function mountStepper(modelValue: number, props: { min?: number, max?: number, step?: number } = {}) {
    return mountSuspended(UiStepper, { props: { modelValue, label: 'Gobelets', ...props } })
  }

  it('counts by its step, both ways', async () => {
    const stepper = await mountStepper(24, { step: 24 })
    const [less, more] = stepper.findAll('button')

    await more?.trigger('click')
    await more?.trigger('click')
    await less?.trigger('click')

    expect(stepper.emitted('update:modelValue')).toEqual([[48], [72], [48]])
  })

  it('never goes past its bounds', async () => {
    /**
     * Given a quantity that one step would take below zero
     * When it is lowered
     * Then it stops at zero
     */
    const stepper = await mountStepper(10, { step: 24 })

    await stepper.findAll('button')[0]?.trigger('click')

    expect(stepper.emitted('update:modelValue')).toEqual([[0]])
  })

  it.each([
    ['minimum', 0, 0],
    ['maximum', 5, 1],
  ])('disables its button at the %s', async (_bound, quantity, disabledButton) => {
    const stepper = await mountStepper(quantity, { min: 0, max: 5 })
    const buttons = stepper.findAll('button')

    expect(buttons[disabledButton]?.attributes('disabled')).toBeDefined()
    expect(buttons[1 - disabledButton]?.attributes('disabled')).toBeUndefined()
  })

  it('names its buttons after what it counts', async () => {
    const stepper = await mountStepper(1)

    expect(stepper.findAll('button').map(button => button.attributes('aria-label'))).toEqual([
      'Retirer : Gobelets',
      'Ajouter : Gobelets',
    ])
  })
})
