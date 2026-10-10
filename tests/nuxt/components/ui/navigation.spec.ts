import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import UiBreadcrumb from '~/components/ui/Breadcrumb.vue'
import UiPagination from '~/components/ui/Pagination.vue'
import UiTabs from '~/components/ui/Tabs.vue'

describe('UiTabs', () => {
  const tabs = [
    { value: 'notes', label: 'Notes du bureau', count: '6' },
    { value: 'tasks', label: 'Tâches', count: '9/14' },
    { value: 'public', label: 'Infos publiques' },
  ] as const

  function mountTabs(modelValue: 'notes' | 'tasks' | 'public') {
    return mountSuspended(UiTabs<'notes' | 'tasks' | 'public'>, {
      props: { modelValue, tabs, label: 'Sections de l’événement' },
      slots: { default: ({ selected }: { selected: string }) => `Section ${selected}` },
      attachTo: document.body,
    })
  }

  it('ties its tabs to the panel of the one selected', async () => {
    const tabList = await mountTabs('tasks')

    const [notes, tasks] = tabList.findAll('[role="tab"]')
    const panel = tabList.get('[role="tabpanel"]')
    expect(tabList.get('[role="tablist"]').attributes('aria-label')).toBe('Sections de l’événement')
    expect(tasks?.attributes()).toMatchObject({ 'aria-selected': 'true', 'tabindex': '0' })
    expect(notes?.attributes()).toMatchObject({ 'aria-selected': 'false', 'tabindex': '-1' })
    expect(tasks?.attributes('aria-controls')).toBe(panel.attributes('id'))
    expect(panel.attributes('aria-labelledby')).toBe(tasks?.attributes('id'))
    expect(panel.text()).toBe('Section tasks')
    expect(tasks?.text()).toBe('Tâches 9/14')
    tabList.unmount()
  })

  it.each([
    ['ArrowRight', 'notes', 'tasks'],
    ['ArrowRight', 'public', 'notes'],
    ['ArrowLeft', 'notes', 'public'],
    ['Home', 'public', 'notes'],
    ['End', 'notes', 'public'],
  ] as const)('selects and focuses another tab on %s', async (key, from, to) => {
    const tabList = await mountTabs(from)

    await tabList.get('[aria-selected="true"]').trigger('keydown', { key })

    expect(tabList.emitted('update:modelValue')).toEqual([[to]])
    expect(document.activeElement?.textContent).toContain(tabs.find(tab => tab.value === to)?.label)
    tabList.unmount()
  })

  it('selects the tab clicked, and ignores the other keys', async () => {
    const tabList = await mountTabs('notes')

    await tabList.get('[aria-selected="true"]').trigger('keydown', { key: 'Enter' })
    await tabList.findAll('[role="tab"]')[2]?.trigger('click')

    expect(tabList.emitted('update:modelValue')).toEqual([['public']])
    tabList.unmount()
  })

  it('keeps the tab selected in sight, when it shows as when another is chosen', async () => {
    /**
     * Given a bar that scrolls on a phone, and its last tab chosen by the address
     * When the tabs show, then the first is chosen
     * Then each tab chosen is brought into sight, and the page moves only if it must
     */
    const reveal = vi.spyOn(Element.prototype, 'scrollIntoView')
    const tabList = await mountTabs('public')

    await tabList.setProps({ modelValue: 'notes' })

    expect(reveal.mock.contexts.map(tab => (tab as Element).id)).toEqual([
      tabList.findAll('[role="tab"]')[2]?.attributes('id'),
      tabList.findAll('[role="tab"]')[0]?.attributes('id'),
    ])
    expect(reveal.mock.calls).toEqual([[{ block: 'nearest', inline: 'nearest' }], [{ block: 'nearest', inline: 'nearest' }]])
    reveal.mockRestore()
    tabList.unmount()
  })
})

describe('UiBreadcrumb', () => {
  it('leads back to the sections above the current page, which it marks', async () => {
    const breadcrumb = await mountSuspended(UiBreadcrumb, {
      props: { items: [{ label: 'Événements', to: '/bureau/evenements' }, { label: 'Halloween des enfants' }] },
    })

    expect(breadcrumb.get('nav').attributes('aria-label')).toBe('Fil d’Ariane')
    expect(breadcrumb.get('a').attributes('href')).toBe('/bureau/evenements')
    expect(breadcrumb.get('[aria-current="page"]').text()).toBe('Halloween des enfants')
    expect(breadcrumb.find('a svg').exists()).toBe(false)
  })

  it('shows the way back on the public site', async () => {
    const breadcrumb = await mountSuspended(UiBreadcrumb, {
      props: { items: [{ label: 'Agenda', to: '/#agenda' }, { label: 'Halloween des enfants' }], back: true },
    })

    expect(breadcrumb.get('a').attributes('href')).toBe('/#agenda')
    expect(breadcrumb.find('a svg').exists()).toBe(true)
  })
})

describe('UiPagination', () => {
  const to = (page: number) => ({ path: '/bureau/evenements', query: { page } })

  it('leads to the pages around the one shown', async () => {
    const pagination = await mountSuspended(UiPagination, { props: { page: 2, pageCount: 3, to } })

    expect(pagination.findAll('a').map(link => link.attributes('href'))).toEqual([
      '/bureau/evenements?page=1',
      '/bureau/evenements?page=3',
    ])
    expect(pagination.text()).toContain('Page 2 sur 3')
  })

  it('disables the way out of the list at its ends', async () => {
    const pagination = await mountSuspended(UiPagination, { props: { page: 1, pageCount: 2, to } })

    expect(pagination.get('button').text()).toBe('Précédent')
    expect(pagination.get('button').attributes('disabled')).toBeDefined()
    expect(pagination.get('a').text()).toBe('Suivant')
  })

  it('is hidden when the list holds on a single page', async () => {
    const pagination = await mountSuspended(UiPagination, { props: { page: 1, pageCount: 1, to } })

    expect(pagination.find('nav').exists()).toBe(false)
  })
})
