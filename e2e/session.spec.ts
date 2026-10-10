import { expect, test } from '@nuxt/test-utils/playwright'

// The station the journey staffs, then deletes, on Halloween.
const STATION = 'Buvette du parcours'

// The document the journey deposits, validates, then deletes.
const DOCUMENT = 'Facture — Parcours du bureau'

// The borrower of the loans the journey records, then cancels.
const BORROWER = 'Parcours du bureau'

// A day some days ahead, as a date field takes it.
function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

// The fictitious board member of fixtures/board-member.json.
const MEMBER = {
  email: 'camille.martin@example.test',
  password: 'parcours-du-bureau-2026',
  name: 'Camille Martin',
}

test('a board member signs in, keeps their session over a reload, staffs a station, validates a document, records a loan in conflict, then signs out', async ({ page, goto }) => {
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

  await test.step('a document is deposited, completed, then validated', async () => {
    await page.getByRole('navigation', { name: 'Espace bureau' }).getByRole('link', { name: /^Documents/ }).click()
    await expect(page).toHaveURL('/bureau/documents')
    const rows = page.getByRole('listitem').filter({ hasText: DOCUMENT })
    const panel = page.getByRole('complementary', { name: DOCUMENT })

    // A journey cut short leaves its document behind, which a new try deletes
    // first, once the search has kept it alone.
    await page.getByLabel('Rechercher dans les documents').fill(DOCUMENT)
    await expect(page).toHaveURL(/recherche=/)
    await expect(page.getByText(/Aucun document ne correspond|Parcours du bureau/).first()).toBeVisible()
    for (let left = await rows.count(); left > 0; left -= 1) {
      await rows.first().getByRole('link').click()
      await panel.getByRole('button', { name: 'Corriger' }).click()
      await panel.getByRole('button', { name: 'Supprimer' }).click()
      await panel.getByRole('button', { name: 'Supprimer définitivement' }).click()
      await expect(rows).toHaveCount(left - 1)
    }

    // A file of its own on every try: the same file twice is refused.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'facture-parcours.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(`%PDF-1.4\n% ${Date.now()}\n%%EOF\n`),
    })
    await page.getByLabel('Catégorie', { exact: true }).selectOption('invoice')
    await page.getByLabel('Titre', { exact: true }).fill(DOCUMENT)
    await page.getByRole('button', { name: 'Déposer' }).click()

    // The document deposited opens on its form, to complete it.
    await panel.getByLabel('Fournisseur').fill('Animation 60')
    await panel.getByLabel('Montant TTC').fill('380,00')
    await panel.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(panel.getByText('380,00')).toBeVisible()
    await expect(rows).toContainText('À vérifier')

    await panel.getByRole('button', { name: 'Valider la facture' }).click()
    await expect(panel.getByText('Validée par Camille M.')).toBeVisible()
    await expect(rows).not.toContainText('À vérifier')

    await panel.getByRole('button', { name: 'Corriger' }).click()
    await panel.getByRole('button', { name: 'Supprimer' }).click()
    await panel.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(rows).toHaveCount(0)
  })

  await test.step('a loan in conflict is blocked, then brought back to what is free', async () => {
    // The loans of the journey not yet cancelled, in the list of all the
    // loans: the planning above it lists them too.
    const loans = page.getByRole('list', { name: 'Prêts', exact: true })
    const confirmed = loans.getByRole('listitem').filter({ hasText: BORROWER }).filter({ hasText: 'Confirmé' })
    const panel = page.getByRole('region', { name: BORROWER })
    const summary = page.getByRole('complementary', { name: 'Récapitulatif' })
    const save = summary.getByRole('button', { name: 'Enregistrer le prêt' })

    async function cancelShown(): Promise<void> {
      await panel.getByRole('button', { name: 'Annuler le prêt' }).click()
      await panel.getByRole('button', { name: 'Confirmer l’annulation' }).click()
      await expect(panel.getByText('Annulé', { exact: true })).toBeVisible()
    }

    // A journey cut short leaves its loans behind, holding the refrigerator:
    // a new try cancels them first, once the loans have come. It stays on all
    // the loans: a chip would show the rows of the list it leaves until its
    // own came.
    await page.getByRole('navigation', { name: 'Espace bureau' }).getByRole('link', { name: /^Prêts/ }).click()
    await expect(loans).toBeVisible()
    for (let left = await confirmed.count(); left > 0; left -= 1) {
      await confirmed.first().getByRole('link').click()
      await cancelShown()
      await expect(confirmed).toHaveCount(left - 1)
    }

    // A first loan takes the only refrigerator, far ahead.
    await page.getByRole('link', { name: 'Nouveau prêt' }).click()
    await expect(page).toHaveURL('/bureau/prets/nouveau')
    await page.getByLabel('Nom de l’association').fill(BORROWER)
    await page.getByLabel('Sortie du matériel').fill(daysAhead(40))
    await page.getByLabel('Retour', { exact: true }).fill(daysAhead(41))
    await page.getByRole('button', { name: 'Ajouter : Réfrigérateur vitrine' }).click()
    await save.click()
    await expect(page).toHaveURL(/pret=\d+/)
    await expect(panel.getByText(/P-\d{4}-\d{3}/)).toBeVisible()

    // A second, two days later, takes it too, with six high tables.
    await page.getByRole('link', { name: 'Nouveau prêt' }).click()
    await page.getByLabel('Nom de l’association').fill(BORROWER)
    await page.getByLabel('Sortie du matériel').fill(daysAhead(43))
    await page.getByLabel('Retour', { exact: true }).fill(daysAhead(44))
    await page.getByRole('button', { name: 'Ajouter : Réfrigérateur vitrine' }).click()
    for (let table = 0; table < 6; table += 1) {
      await page.getByRole('button', { name: 'Ajouter : Mange-debout' }).click()
    }
    await expect(summary.getByText('Tout est disponible sur la période.')).toBeVisible()

    // Brought onto the days of the first, it is in conflict, and blocked.
    await page.getByLabel('Sortie du matériel').fill(daysAhead(40))
    await page.getByLabel('Retour', { exact: true }).fill(daysAhead(41))
    await expect(summary.getByText('Réfrigérateur vitrine : 1 demandé, aucun libre sur la période.')).toBeVisible()
    await expect(save).toBeDisabled()

    await summary.getByRole('button', { name: 'Ramener aux quantités libres' }).click()
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page).toHaveURL(/pret=\d+/)
    await expect(panel.getByText('Mange-debout')).toBeVisible()
    await expect(panel.getByText('Réfrigérateur vitrine')).toHaveCount(0)

    // Both loans are cancelled, the first once the list has followed the
    // second: the next try starts afresh.
    await cancelShown()
    await expect(confirmed).toHaveCount(1)
    await confirmed.first().getByRole('link').click()
    await cancelShown()
    await expect(confirmed).toHaveCount(0)
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
