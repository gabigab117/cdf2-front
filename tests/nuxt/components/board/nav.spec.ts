import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import BoardNav from '~/components/board/Nav.vue'

describe('BoardNav', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(async () => {
    useSessionStore().clear()
    await useRouter().push('/')
  })

  it('leads to a page from every entry', async () => {
    /**
     * Given the board's navigation
     * Then each of its entries opens a page, even before its screen exists
     */
    const nav = await mountSuspended(BoardNav, { route: '/bureau' })
    const router = useRouter()

    const links = nav.findAll('a')
    expect(links.map(link => link.text())).toEqual([
      'Tableau de bord', 'Événements', 'Photos', 'Documents', 'Trésorerie', 'Stock', 'Matériel', 'Prêts',
    ])
    for (const link of links) {
      expect(router.resolve(link.attributes('href') ?? '').matched, link.text()).not.toHaveLength(0)
    }
  })

  it('marks the entry of the current page, and only that one', async () => {
    /**
     * Given a member on the Stock screen
     * Then "Stock" is the current entry, and the dashboard, which every board
     * page is under, is not
     */
    const nav = await mountSuspended(BoardNav, { route: '/bureau/stock' })

    const current = nav.findAll('a[aria-current="page"]')
    expect(current.map(link => link.text())).toEqual(['Stock'])
  })
})
