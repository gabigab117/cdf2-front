import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import BoardTopBar from '~/components/board/TopBar.vue'

describe('BoardTopBar', () => {
  afterEach(async () => {
    useSessionStore().clear()
    await useRouter().push('/')
  })

  it('opens the « Nouveau » menu with the browser\'s own popover, which leads to a new event', async () => {
    const bar = await mountSuspended(BoardTopBar)

    const menu = bar.get('[popover]')
    const button = bar.findAll('button').find(candidate => candidate.text() === 'Nouveau')!
    expect(button.attributes('popovertarget')).toBe(menu.attributes('id'))
    expect(menu.get('nav').attributes('aria-label')).toBe('Nouveau')
    expect(menu.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Événement', '/bureau/evenements/nouveau'],
      ['Tâche', '/bureau/taches/nouvelle'],
      ['Document', '/bureau/documents/nouveau'],
    ])
  })

  it('asks to open the navigation, on a phone', async () => {
    const bar = await mountSuspended(BoardTopBar)

    await bar.get('button[aria-label="Ouvrir la navigation"]').trigger('click')

    expect(bar.emitted('openNavigation')).toHaveLength(1)
  })

  it('leaves its place to the action of a page that has one', async () => {
    /**
     * Given the Documents page, whose action is « Importer »
     * Then the bar holds the place where the page renders it, and no « Nouveau » menu
     */
    useSessionStore().accessToken = 'access-1'
    const bar = await mountSuspended(BoardTopBar, { route: '/bureau/documents' })

    expect(bar.find('#board-top-bar-action').exists()).toBe(true)
    expect(bar.findAll('button').some(candidate => candidate.text() === 'Nouveau')).toBe(false)
  })
})
