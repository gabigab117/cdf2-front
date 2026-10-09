import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorPage from '~/error.vue'

const { clearErrorMock } = vi.hoisted(() => ({ clearErrorMock: vi.fn() }))
mockNuxtImport('clearError', () => clearErrorMock)

function buttons(page: VueWrapper): string[] {
  return page.findAll('button').map(button => button.text())
}

function links(page: VueWrapper): string[][] {
  return page.findAll('a').map(link => [link.text(), link.attributes('href') ?? ''])
}

describe('error page', () => {
  afterEach(() => {
    clearErrorMock.mockReset()
    useSessionStore().clear()
  })

  it('says that a page does not exist', async () => {
    const page = await mountSuspended(ErrorPage, { props: { error: createError({ status: 404 }) } })

    expect(page.text()).toContain('Erreur 404')
    expect(page.text()).toContain('Cette page n’existe pas')
    expect(buttons(page)).toEqual([])
    // A link, which leads home without JavaScript too.
    expect(links(page)).toEqual([['Retour à l’accueil', '/']])
  })

  it('never shows the message of the error itself', async () => {
    /**
     * Given an error the code raised, with a message meant for developers
     * Then the page only says that an error occurred
     */
    const error = createError({ status: 500, message: 'Cannot read properties of undefined (reading \'id\')' })

    const page = await mountSuspended(ErrorPage, { props: { error } })

    expect(page.text()).toContain('Une erreur est survenue')
    expect(page.text()).not.toContain('Cannot read properties')
  })

  it('offers to try again a page that could not open for the time being', async () => {
    /**
     * Given a board page whose session could not be checked
     * When the member asks to try again
     * Then that page is opened again
     */
    const error = createError({ status: 503, data: { path: '/bureau/stock' } })
    const page = await mountSuspended(ErrorPage, { props: { error } })

    await page.get('button').trigger('click')

    expect(buttons(page)).toEqual(['Réessayer'])
    expect(links(page)).toEqual([['Retour à l’accueil', '/']])
    expect(clearErrorMock).toHaveBeenCalledWith({ redirect: '/bureau/stock' })
  })

  it('shows the way back to the board to a signed-in member only', async () => {
    useSessionStore().accessToken = 'access-1'

    const page = await mountSuspended(ErrorPage, { props: { error: createError({ status: 404 }) } })

    expect(buttons(page)).toEqual(['Espace bureau'])
    expect(links(page)).toEqual([['Retour à l’accueil', '/']])
  })
})
