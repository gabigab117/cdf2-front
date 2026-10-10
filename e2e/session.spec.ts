import { expect, test } from '@nuxt/test-utils/playwright'

// The fictitious board member of fixtures/board-member.json.
const MEMBER = {
  email: 'camille.martin@example.test',
  password: 'parcours-du-bureau-2026',
  name: 'Camille Martin',
}

test('a board member signs in, keeps their session over a reload, then signs out', async ({ page, goto }) => {
  await test.step('signing in brings the member to the page they asked for', async () => {
    await goto('/bureau/documents', { waitUntil: 'hydration' })
    await expect(page).toHaveURL('/connexion?redirect=/bureau/documents')

    await page.getByLabel('Adresse e-mail').fill(MEMBER.email)
    await page.getByLabel('Mot de passe').fill(MEMBER.password)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page).toHaveURL('/bureau/documents')
    await expect(page.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible()
    await expect(page.getByText(MEMBER.name)).toBeVisible()
  })

  await test.step('a reload keeps the session, without asking for the password', async () => {
    await page.reload()

    await expect(page).toHaveURL('/bureau/documents')
    await expect(page.getByText(MEMBER.name)).toBeVisible()
  })

  await test.step('the dashboard greets the member, and its menu leads to a new event', async () => {
    await page.getByRole('navigation', { name: 'Espace bureau' }).getByRole('link', { name: 'Tableau de bord' }).click()

    await expect(page).toHaveURL('/bureau')
    await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Camille' })).toBeVisible()
    // The events of the demonstration follow the day they were written: an
    // event is found by its name, never by its place.
    const upcoming = page.locator('section', { hasText: 'Événements à venir' })
    await expect(upcoming.getByRole('link', { name: /Halloween des enfants/ })).toBeVisible()

    // The browser's own popover: a test environment has none, this one does.
    await page.getByRole('button', { name: 'Nouveau' }).click()
    await page.getByRole('navigation', { name: 'Nouveau' }).getByRole('link', { name: 'Événement' }).click()

    await expect(page).toHaveURL('/bureau/evenements/nouveau')
  })

  await test.step('signing out closes the session for good', async () => {
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL('/connexion')

    await goto('/bureau', { waitUntil: 'hydration' })
    await expect(page).toHaveURL('/connexion?redirect=/bureau')
  })
})

test('wrong credentials are refused', async ({ page, goto }) => {
  await goto('/connexion', { waitUntil: 'hydration' })

  await page.getByLabel('Adresse e-mail').fill(MEMBER.email)
  await page.getByLabel('Mot de passe').fill('pas le bon mot de passe')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page.getByRole('alert')).toHaveText('Identifiants invalides.')
  await expect(page).toHaveURL('/connexion')
})
