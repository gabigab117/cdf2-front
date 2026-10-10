import { expect, test } from '@nuxt/test-utils/playwright'
import { PUBLICATION_DIRECTOR } from './legal-notice'

// The legal notice names its publication director from private keys of the
// configuration: served without scripts (routeRules), it is rendered by the
// server alone, and that name is written into no other page.

test('the legal notice loads anew from a page of the site, and names its director', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  // A mark on the hydrated home page: a new document no longer has it.
  await page.evaluate(() => Object.assign(window, { hydratedHome: true }))

  // A key press follows the link without hovering it, which would have the
  // browser prerender the page beforehand.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Mentions légales' }).press('Enter')

  await expect(page).toHaveURL('/mentions-legales')
  await expect(page.getByText(PUBLICATION_DIRECTOR)).toBeVisible()
  expect(await page.evaluate(() => 'hydratedHome' in window)).toBe(false)
  // Nuxt never started on it: no application, no payload.
  expect(await page.evaluate(() => '__NUXT__' in window)).toBe(false)
  await expect(page.locator('#__NUXT_DATA__')).toHaveCount(0)
})

test('the director is named on the legal notice alone', async ({ request }) => {
  const html = async (path: string) => (await request.get(path, { headers: { Accept: 'text/html' } })).text()
  const { items } = await (await request.get('/api/public/events?page_size=1')).json() as { items: Array<{ slug: string }> }

  expect(await html('/mentions-legales')).toContain(PUBLICATION_DIRECTOR)
  // The public pages, a page not found, and the shells of the client-rendered
  // pages, which carry the configuration written for the browser.
  for (const path of ['/', `/evenements/${items[0]?.slug}`, '/donnees-personnelles', '/evenements/inconnu-2026', '/connexion', '/bureau']) {
    expect(await html(path), path).not.toContain(PUBLICATION_DIRECTOR)
  }
})
