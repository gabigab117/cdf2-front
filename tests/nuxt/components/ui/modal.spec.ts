import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import UiModal from '~/components/ui/Modal.vue'

async function mountModal() {
  return mountSuspended(UiModal, {
    props: { 'open': false, 'title': 'Facture — Location sono', 'subtitle': 'facture-sono.pdf · 117 Ko', 'onUpdate:open': () => undefined },
    slots: {
      default: () => h('article', 'Le document'),
      actions: () => h('button', { type: 'button' }, 'Télécharger'),
    },
  })
}

describe('UiModal', () => {
  it('opens as a modal dialog of the browser, named by its title', async () => {
    /**
     * Given a closed modal
     * When it is asked to open
     * Then the browser shows it as a modal dialog, which keeps the focus inside
     * And its title names it for screen readers
     */
    const modal = await mountModal()
    const dialog = modal.element as HTMLDialogElement

    await modal.setProps({ open: true })

    expect(dialog.open).toBe(true)
    const title = modal.get('h2')
    expect(modal.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(title.text()).toBe('Facture — Location sono')
    expect(modal.text()).toContain('facture-sono.pdf · 117 Ko')
  })

  it('closes when asked', async () => {
    const modal = await mountModal()
    await modal.setProps({ open: true })

    await modal.setProps({ open: false })

    expect((modal.element as HTMLDialogElement).open).toBe(false)
  })

  it('reports its closing by the browser, as on Escape', async () => {
    const modal = await mountModal()
    await modal.setProps({ open: true })

    await modal.trigger('close')

    expect(modal.emitted('update:open')).toEqual([[false]])
  })

  it('closes with its button', async () => {
    const modal = await mountModal()
    await modal.setProps({ open: true })

    await modal.get('button[aria-label="Fermer"]').trigger('click')

    expect(modal.emitted('update:open')).toEqual([[false]])
  })

  it('closes on a click on the backdrop, not on its content', async () => {
    const modal = await mountModal()
    await modal.setProps({ open: true })

    await modal.get('article').trigger('click')
    await modal.get('header button').trigger('click')
    expect(modal.emitted('update:open')).toBeUndefined()

    await modal.trigger('click')
    expect(modal.emitted('update:open')).toEqual([[false]])
  })
})
