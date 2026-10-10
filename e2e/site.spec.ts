import { expect, test } from '@nuxt/test-utils/playwright'
import { PUBLICATION_DIRECTOR } from './legal-notice'

// The public site read without JavaScript: what the server writes is all a
// search engine reads. The demo events (manage.py seed_demo) move with the
// date, so they are found by their names, never by their order.
test.use({ javaScriptEnabled: false })

test('the home page shows the next event and the agenda', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Les fêtes du village, organisées par ses bénévoles.')
  await expect(page.getByText('Prochain rendez-vous')).toBeVisible()
  const agenda = page.locator('#agenda')
  await expect(agenda.getByRole('heading', { level: 3, name: 'Halloween des enfants' })).toBeVisible()
  await expect(agenda.getByRole('heading', { level: 3, name: 'Loto d’automne' })).toBeVisible()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://site.example/')
  // The preproduction says its data is fictitious, and is never indexed.
  await expect(page.getByText('Préproduction — données fictives')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})

test('a category of the agenda filters it', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('navigation', { name: 'Filtrer par type d’événement' }).getByRole('link', { name: 'Jeux' }).click()

  await expect(page).toHaveURL('/?categorie=jeux#agenda')
  const titles = page.locator('#agenda h3')
  await expect(titles.filter({ hasText: 'Loto d’automne' })).toHaveCount(1)
  await expect(titles.filter({ hasText: 'Halloween des enfants' })).toHaveCount(0)
  await expect(page.locator('#agenda [aria-current="page"]')).toHaveText('Jeux')
})

test('an event of the agenda opens on its page', async ({ page }) => {
  await page.goto('/')

  await page.locator('#agenda').getByRole('link', { name: /Halloween des enfants/ }).click()

  await expect(page).toHaveURL(/\/evenements\/halloween-des-enfants-\d{4}$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Halloween des enfants')
  await expect(page.getByText('Accueil et maquillage')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bon à savoir' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mon agenda' })).toHaveAttribute('href', /^\/api\/public\/events\/halloween-des-enfants-\d{4}\.ics$/)
  // Sharing needs JavaScript: without it, no button that would do nothing.
  await expect(page.getByRole('button', { name: 'Partager' })).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/site\.example\/evenements\/halloween-des-enfants-\d{4}$/)
})

test('an address the agenda does not know is not found, with a way home', async ({ page }) => {
  const response = await page.goto('/evenements/inconnu-2026')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cette page n’existe pas')
  await page.getByRole('link', { name: 'Retour à l’accueil' }).click()
  await expect(page).toHaveURL('/')
})

test('the legal pages read from the footer of any page', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Mentions légales' }).click()

  await expect(page).toHaveURL('/mentions-legales')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mentions légales')
  await expect(page.getByText(PUBLICATION_DIRECTOR)).toBeVisible()

  await page.getByRole('contentinfo').getByRole('link', { name: 'Données personnelles' }).click()

  await expect(page).toHaveURL('/donnees-personnelles')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Données personnelles')
  await expect(page.getByRole('heading', { name: 'Durées de conservation' })).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the menu opens and leads to a section of the home page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    const menu = page.locator('[popover]')
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Contact' }).click()

    await expect(page).toHaveURL('/#contact')
  })
})
