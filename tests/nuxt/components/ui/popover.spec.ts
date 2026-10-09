import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import UiPopover from '~/components/ui/Popover.vue'

// The test environment knows no popover: the browser's own behaviour, opening
// and closing, is checked on captures. These tests check what ties it together.
function mountPopover() {
  return mountSuspended(UiPopover, {
    props: { placement: 'site' },
    slots: {
      invoker: ({ invoker }: { invoker: Record<string, string> }) => h('button', { type: 'button', ...invoker }, 'Ouvrir'),
      default: ({ closer }: { closer: Record<string, string> }) => h('button', { type: 'button', ...closer }, 'Fermer'),
    },
  })
}

describe('UiPopover', () => {
  afterEach(async () => {
    await useRouter().push('/')
  })

  it('ties its buttons to its panel, which the browser opens and closes', async () => {
    const popover = await mountPopover()

    const panel = popover.get('[popover]')
    const [open, close] = popover.findAll('button')
    expect(panel.attributes('id')).toBeTruthy()
    expect(open?.attributes('popovertarget')).toBe(panel.attributes('id'))
    expect(close?.attributes('popovertarget')).toBe(panel.attributes('id'))
    expect(close?.attributes('popovertargetaction')).toBe('hide')
    expect(open?.attributes('popovertargetaction')).toBeUndefined()
  })

  it('closes when the page changes', async () => {
    const popover = await mountPopover()
    const panel = popover.get('[popover]').element as HTMLElement
    const hidePopover = vi.fn()
    Object.assign(panel, { hidePopover, matches: (selector: string) => selector === ':popover-open' })

    await useRouter().push('/#comite')

    expect(hidePopover).toHaveBeenCalledOnce()
  })
})
