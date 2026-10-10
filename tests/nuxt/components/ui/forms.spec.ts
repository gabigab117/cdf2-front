import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import UiDropZone from '~/components/ui/DropZone.vue'
import UiSearchInput from '~/components/ui/SearchInput.vue'
import UiSelect from '~/components/ui/Select.vue'
import UiSwitch from '~/components/ui/Switch.vue'
import UiTextarea from '~/components/ui/Textarea.vue'

describe('UiSelect', () => {
  const options = [
    { value: null, label: 'Aucun' },
    { value: 3, label: 'Julie Roux' },
  ]

  async function choose(select: Awaited<ReturnType<typeof mountSelect>>, index: number) {
    const element = select.get('select')
    ;(element.element as HTMLSelectElement).selectedIndex = index
    await element.trigger('change')
  }

  function mountSelect(modelValue: number | null) {
    return mountSuspended(UiSelect<number | null>, {
      props: { modelValue, options },
      attrs: { 'id': 'lead', 'required': true, 'aria-describedby': 'lead-help' },
    })
  }

  it('reports the value chosen, a number or none', async () => {
    const select = await mountSelect(null)

    await choose(select, 1)
    await choose(select, 0)

    expect(select.emitted('update:modelValue')).toEqual([[3], [null]])
  })

  it('hands its attributes to the select itself', async () => {
    const select = await mountSelect(3)

    expect(select.get('select').attributes()).toMatchObject({
      'id': 'lead',
      'required': '',
      'aria-describedby': 'lead-help',
    })
    expect(select.attributes('id')).toBeUndefined()
  })

  it('offers its placeholder as an empty value that cannot be chosen', async () => {
    /**
     * Given a select that nothing is chosen in yet
     * Then its placeholder holds an empty value, which a required select
     * refuses to send
     */
    const select = await mountSuspended(UiSelect<'children' | ''>, {
      props: { modelValue: '', options: [{ value: 'children', label: 'Enfants' }], placeholder: 'Choisir…' },
    })

    const placeholder = select.get('option')
    expect(placeholder.attributes()).toMatchObject({ value: '', disabled: '' })
    expect((select.get('select').element as HTMLSelectElement).value).toBe('')
  })

  it('shows a value the API refused', async () => {
    const select = await mountSuspended(UiSelect<number | null>, { props: { modelValue: 3, options, invalid: true } })

    expect(select.get('select').attributes('aria-invalid')).toBe('true')
  })
})

describe('UiTextarea', () => {
  it('reports what is typed, and shows a value the API refused', async () => {
    const textarea = await mountSuspended(UiTextarea, { props: { modelValue: '', invalid: true } })

    await textarea.setValue('Défilé costumé, puis goûter.')

    expect(textarea.emitted('update:modelValue')).toEqual([['Défilé costumé, puis goûter.']])
    expect(textarea.attributes('aria-invalid')).toBe('true')
  })
})

describe('UiSwitch', () => {
  it('is a switch named by its label, which reports its state', async () => {
    const toggle = await mountSuspended(UiSwitch, {
      props: { modelValue: false, label: 'Publié sur le site' },
      attrs: { 'aria-describedby': 'published-help' },
    })
    const input = toggle.get('input')

    await input.setValue(true)

    expect(input.attributes()).toMatchObject({ 'type': 'checkbox', 'role': 'switch', 'aria-describedby': 'published-help' })
    expect(toggle.text()).toBe('Publié sur le site')
    expect(toggle.emitted('update:modelValue')).toEqual([[true]])
  })
})

describe('UiSearchInput', () => {
  it('is a search field named by its label, which reports what is typed', async () => {
    const search = await mountSuspended(UiSearchInput, {
      props: { modelValue: '', label: 'Rechercher dans les documents' },
      attrs: { placeholder: 'Fournisseur, montant…' },
    })

    await search.get('input').setValue('sono')

    expect(search.get('input').attributes('type')).toBe('search')
    expect(search.get('input').attributes('placeholder')).toBe('Fournisseur, montant…')
    expect(search.get('label').text()).toBe('Rechercher dans les documents')
    expect(search.emitted('update:modelValue')).toEqual([['sono']])
  })
})

describe('UiDropZone', () => {
  const pdf = new File(['%PDF-1.4'], 'facture.pdf', { type: 'application/pdf' })

  it('gives the file dropped onto it', async () => {
    /**
     * Given a file dragged over the zone
     * Then the zone shows it is ready to take it, and gives it once dropped
     */
    const zone = await mountSuspended(UiDropZone, { props: { accept: 'application/pdf' } })

    await zone.trigger('dragover')
    expect(zone.classes()).toContain('border-azur-600')
    await zone.trigger('drop', { dataTransfer: { files: [pdf] } })

    expect(zone.emitted('choose')).toEqual([[pdf]])
    expect(zone.classes()).not.toContain('border-azur-600')
  })

  it('gives the file chosen with its button, which opens the file picker', async () => {
    /**
     * Given the zone's button, which offers the accepted types
     * When it is pressed and a file chosen
     * Then the zone gives the file, and the picker takes the same file again
     */
    const zone = await mountSuspended(UiDropZone, { props: { accept: 'application/pdf' } })
    const picker = zone.get<HTMLInputElement>('input[type="file"]')
    const click = vi.spyOn(picker.element, 'click').mockImplementation(() => {})

    await zone.get('button').trigger('click')
    Object.defineProperty(picker.element, 'files', { value: [pdf], configurable: true })
    await picker.trigger('change')

    expect(click).toHaveBeenCalledOnce()
    expect(picker.attributes('accept')).toBe('application/pdf')
    expect(zone.emitted('choose')).toEqual([[pdf]])
  })

  it('gives nothing when no file comes', async () => {
    const zone = await mountSuspended(UiDropZone, { props: { accept: 'application/pdf' } })

    await zone.trigger('drop', { dataTransfer: { files: [] } })
    await zone.get('input[type="file"]').trigger('change')

    expect(zone.emitted('choose')).toBeUndefined()
  })
})
