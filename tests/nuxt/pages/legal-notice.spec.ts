import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LegalNoticePage from '~/pages/legal-notice.vue'

// The page is served without scripts: the browser's router turns any
// navigation to it into a page load. It mounts where the router already is.
function mountNotice() {
  return mountSuspended(LegalNoticePage, { route: false })
}

function details(page: Awaited<ReturnType<typeof mountNotice>>) {
  return page.findAll('dl > div').map(detail => [detail.get('dt').text(), detail.get('dd').text()])
}

describe('legal notice', () => {
  afterEach(() => {
    const { legal } = useRuntimeConfig()
    legal.host.phone = '01 98 76 54 32'
    legal.publicationDirector = 'Dominique Exemple'
  })

  enableAutoUnmount(afterEach)

  it('names the publisher, the publication director and the host, from the configuration', async () => {
    /**
     * Given the legal details of the configuration (fictitious in the tests)
     * When the legal notice is rendered
     * Then it names the association, its office and contact, the publication
     * director and the host
     */
    const page = await mountNotice()

    expect(page.get('h1').text()).toBe('Mentions légales')
    expect(page.findAll('h2').map(title => title.text())).toEqual([
      'Éditeur', 'Direction de la publication', 'Hébergement', 'Propriété intellectuelle', 'Données personnelles',
    ])
    expect(page.text()).toContain('Ce site est édité par le Comité des Fêtes d’Ons-en-Bray, association régie par la loi du 1er juillet 1901.')
    expect(details(page)).toEqual([
      ['Siège', '1 place de la Mairie00000 Commune'],
      ['E-mail', 'contact@example.test'],
      ['Téléphone', '01 23 45 67 89'],
      ['Hébergeur', 'Hébergeur Exemple SARL'],
      ['Adresse', '1 rue de l’Exemple, 00000 Ville'],
      ['Téléphone', '01 98 76 54 32'],
      ['Localisation du serveur', 'France'],
    ])
    expect(page.text()).toContain('Dominique Exemple')
    expect(page.get('a[href="mailto:contact@example.test"]').text()).toBe('contact@example.test')
    expect(page.get('a[href="/donnees-personnelles"]').text()).toBe('Données personnelles')
  })

  it('leaves out a detail the configuration does not give', async () => {
    const { legal } = useRuntimeConfig()
    legal.host.phone = ''
    legal.publicationDirector = ''

    const page = await mountNotice()

    expect(details(page).map(([label]) => label)).toEqual(['Siège', 'E-mail', 'Téléphone', 'Hébergeur', 'Adresse', 'Localisation du serveur'])
    expect(page.findAll('h2').map(title => title.text())).not.toContain('Direction de la publication')
  })

  it('keeps out of the search engines, which would show its director\'s name', async () => {
    await mountNotice()

    // The head is written in the document once the page has rendered.
    await vi.waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    })
  })

  it('is served without scripts, at the address of its page', () => {
    // The rule and the page each write the address: apart, the browser would
    // mount the page's stand-in, which reloads it without end.
    expect(getRouteRules({ path: LEGAL_NOTICE_PATH }).noScripts).toBe(true)
    expect(useRouter().resolve(LEGAL_NOTICE_PATH).matched).toHaveLength(1)
  })
})
