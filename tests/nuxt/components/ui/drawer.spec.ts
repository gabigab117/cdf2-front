import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import UiDrawer from '~/components/ui/Drawer.vue'

async function mountDrawer() {
  return mountSuspended(UiDrawer, {
    props: { 'open': false, 'label': 'Navigation', 'onUpdate:open': () => undefined },
    slots: { default: () => h('a', { href: '/bureau' }, 'Tableau de bord') },
  })
}

describe('UiDrawer', () => {
  afterEach(async () => {
    await useRouter().push('/')
  })

  it('opens as a modal dialog of the browser', async () => {
    /**
     * Given a closed drawer
     * When it is asked to open
     * Then the browser shows it as a modal dialog, which keeps the focus inside
     */
    const drawer = await mountDrawer()
    const dialog = drawer.element as HTMLDialogElement

    await drawer.setProps({ open: true })

    expect(dialog.open).toBe(true)
    expect(drawer.attributes('aria-label')).toBe('Navigation')
  })

  it('reports its closing by the browser, as on Escape', async () => {
    const drawer = await mountDrawer()
    await drawer.setProps({ open: true })

    await drawer.trigger('close')

    expect(drawer.emitted('update:open')).toEqual([[false]])
  })

  it('closes on a click on the backdrop, not on its content', async () => {
    const drawer = await mountDrawer()
    await drawer.setProps({ open: true })

    await drawer.get('a').trigger('click')
    expect(drawer.emitted('update:open')).toBeUndefined()

    await drawer.trigger('click')
    expect(drawer.emitted('update:open')).toEqual([[false]])
  })

  it('closes once a link has been followed', async () => {
    const drawer = await mountDrawer()
    await drawer.setProps({ open: true })

    await useRouter().push({ path: '/', query: { page: '2' } })

    expect(drawer.emitted('update:open')).toEqual([[false]])
  })
})
