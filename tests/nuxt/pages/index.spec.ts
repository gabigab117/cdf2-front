import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

describe('home page', () => {
  it('names the committee', async () => {
    const page = await mountSuspended(IndexPage)

    expect(page.text()).toContain('Comité des Fêtes d’Ons-en-Bray')
  })
})
