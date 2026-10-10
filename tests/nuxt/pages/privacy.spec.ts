import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import PrivacyPage from '~/pages/privacy.vue'

function mountPrivacy() {
  return mountSuspended(PrivacyPage, { route: '/donnees-personnelles' })
}

describe('privacy page', () => {
  afterEach(async () => {
    useRuntimeConfig().public.contact.email = 'contact@example.test'
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('tells visitors and board members what the site keeps about them, and for how long', async () => {
    /**
     * Given the personal data the site processes today
     * When the privacy page is rendered
     * Then it describes what visitors and board members leave, how long each
     * detail is kept, and how to exercise one's rights
     */
    const page = await mountPrivacy()

    expect(page.get('h1').text()).toBe('Données personnelles')
    expect(page.findAll('h2').map(title => title.text())).toEqual([
      'Visiteurs du site', 'Membres du bureau', 'Bénévoles et réservations', 'Durées de conservation', 'Vos droits',
    ])
    expect(page.text()).toContain('Le site ne dépose aucun cookie, ne mesure pas son audience et ne vous demande rien.')
    expect(page.text()).toContain('Les notes du bureau portent le nom de leur auteur, les tâches celui de la personne qui les a créées et de celle à qui elles sont assignées. Seul le bureau les lit.')
    expect(page.findAll('tbody tr').map(row => [row.get('th').text(), row.get('td').text()])).toEqual([
      ['Compte d’un membre du bureau', 'Tant que la personne est au bureau. À son départ, le compte est désactivé, et son nom reste sur les événements qu’elle a menés, ses notes et ses tâches. Il est supprimé si elle le demande : ses notes et ses tâches restent, sans son nom.'],
      ['Notes et tâches du bureau', 'Supprimées avec leur événement, ou à la main : une note par son auteur'],
      ['Noms des bénévoles affectés aux postes', 'Effacés 2 ans après l’événement'],
      ['Noms et remarques des réservations', 'Effacés 3 mois après l’événement, les totaux conservés'],
      ['Session de l’espace du bureau', '7 jours, puis effacée la nuit suivante'],
      ['Session de l’administration des comptes', '2 semaines, puis effacée la nuit suivante'],
      ['Compteurs de connexion', 'Effacés chaque nuit'],
      ['Journal du serveur web', '14 jours'],
      ['Journal de l’application', '7 jours'],
    ])
    expect(page.get('a[href="/mentions-legales"]').text()).toBe('mentions légales')
    expect(page.get('a[href="mailto:contact@example.test"]').text()).toBe('contact@example.test')
    expect(page.get('a[href="https://www.cnil.fr"]').text()).toBe('CNIL')
  })

  it('writes to the committee when the configuration gives no address', async () => {
    useRuntimeConfig().public.contact.email = ''

    const page = await mountPrivacy()

    expect(page.find('a[href^="mailto:"]').exists()).toBe(false)
    expect(page.text()).toContain('ou vous opposer à leur traitement, en écrivant au comité.')
  })

  it('leaves no space between a link and the punctuation after it', async () => {
    // The link's text comes as a prop: a slot would leave a space before the comma.
    const page = await mountPrivacy()

    expect(page.text()).toContain('nommé dans les mentions légales, et ne sont transmises à personne.')
  })
})
