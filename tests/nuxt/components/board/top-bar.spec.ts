import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import BoardTopBar from '~/components/board/TopBar.vue'

describe('BoardTopBar', () => {
  it('opens the « Nouveau » menu with the browser\'s own popover, which leads to a new event', async () => {
    const bar = await mountSuspended(BoardTopBar)

    const menu = bar.get('[popover]')
    const button = bar.findAll('button').find(candidate => candidate.text() === 'Nouveau')!
    expect(button.attributes('popovertarget')).toBe(menu.attributes('id'))
    expect(menu.get('nav').attributes('aria-label')).toBe('Nouveau')
    expect(menu.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Événement', '/bureau/evenements/nouveau'],
      ['Tâche', '/bureau/taches/nouvelle'],
    ])
  })

  it('asks to open the navigation, on a phone', async () => {
    const bar = await mountSuspended(BoardTopBar)

    await bar.get('button[aria-label="Ouvrir la navigation"]').trigger('click')

    expect(bar.emitted('openNavigation')).toHaveLength(1)
  })
})
