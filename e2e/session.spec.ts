import { expect, test } from '@nuxt/test-utils/playwright'

// The station the journey staffs, then deletes, on Halloween.
const STATION = 'Buvette du parcours'

// The fictitious board member of fixtures/board-member.json.
const MEMBER = {
  email: 'camille.martin@example.test',
  password: 'parcours-du-bureau-2026',
  name: 'Camille Martin',
}

test('a board member signs in, keeps their session over a reload, staffs a station, then signs out', async ({ page, goto }) => {
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

  await test.step('a volunteer is assigned to a station, and every count follows', async () => {
    await page.getByRole('navigation', { name: 'Espace bureau' }).getByRole('link', { name: 'Tableau de bord' }).click()
    await page.locator('section', { hasText: 'Événements à venir' }).getByRole('link', { name: /Halloween des enfants/ }).click()
    await page.getByRole('tab', { name: /^Postes/ }).click()
    await expect(page).toHaveURL(/onglet=postes/)

    const panel = page.getByRole('tabpanel')
    const stationTab = page.getByRole('tab', { name: /^Postes/ })
    const card = panel.locator('article', { has: page.getByRole('heading', { name: STATION }) })
    const counts = panel.locator('[aria-live="polite"]')

    // A journey cut short leaves its station behind, which a new try deletes
    // first, once the stations have come.
    await expect(panel.getByText(/personnes affectées|Aucun poste pour cet événement/)).toBeVisible()
    for (let left = await card.count(); left > 0; left -= 1) {
      await card.first().getByRole('button', { name: 'Supprimer le poste' }).click()
      await panel.getByRole('button', { name: 'Supprimer définitivement' }).click()
      await expect(card).toHaveCount(left - 1)
    }

    const adding = panel.locator('form', { has: page.getByRole('button', { name: 'Ajouter le poste' }) })
    await adding.getByLabel('Nom du poste').fill(STATION)
    await adding.getByLabel('Personnes requises').fill('2')
    await adding.getByRole('button', { name: 'Ajouter le poste' }).click()
    await expect(card).toBeVisible()

    for (const [name, role] of [['Alice', 'bière uniquement'], ['Bruno', '']] as const) {
      await card.getByLabel('Nom', { exact: true }).fill(name)
      await card.getByLabel('Rôle', { exact: true }).fill(role)
      await card.getByRole('button', { name: `Ajouter une personne au poste ${STATION}` }).click()
      await expect(card.getByRole('button', { name: `Retirer ${name} du poste` })).toBeVisible()
    }
    await expect(counts).toContainText('2 / 2 personnes affectées')
    await expect(counts).toContainText('Complet')
    await expect(stationTab).toContainText('2/2')

    // In the v1, the counts at the top went stale after a change.
    await card.getByRole('button', { name: 'Retirer Alice du poste' }).click()
    await expect(counts).toContainText('1 / 2 personnes affectées')
    await expect(counts).toContainText('1 place à pourvoir')
    await expect(stationTab).toContainText('1/2')

    await card.getByRole('button', { name: 'Supprimer le poste' }).click()
    await panel.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(card).toHaveCount(0)
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
