import { describe, expect, it } from 'vitest'

describe('safeRedirect', () => {
  it.each([
    ['a page of the board', '/bureau/documents', '/bureau/documents'],
    ['a page with its query and anchor', '/bureau/prets?statut=sorti#P-2026-004', '/bureau/prets?statut=sorti#P-2026-004'],
    ['a public page', '/', '/'],
  ])('goes back to %s', (_case, target, expected) => {
    /**
     * Given a member sent to sign in on their way to a page of this site
     * Then they land on that page once signed in
     */
    expect(safeRedirect(target)).toBe(expected)
  })

  it.each([
    ['another site', 'https://other.example/bureau'],
    ['another site, without its scheme', '//other.example/bureau'],
    ['another site, behind a backslash', '/\\other.example/bureau'],
    ['another site, behind a tab', '/\t/other.example/bureau'],
    ['a script', 'javascript:alert(1)'],
    ['the sign-in page itself', '/connexion?redirect=/bureau'],
    ['several addresses', ['/bureau/stock', '/bureau/prets']],
    ['nothing', undefined],
  ])('falls back to the board\'s home for %s', (_case, target) => {
    /**
     * Given a sign-in link that does not lead to a page of this site
     * Then the member lands on the board's home once signed in
     */
    expect(safeRedirect(target)).toBe('/bureau')
  })
})

describe('signInLocation', () => {
  it('brings the member back to where they were going', () => {
    expect(signInLocation('/bureau/stock?vue=bas')).toEqual({
      path: '/connexion',
      query: { redirect: '/bureau/stock?vue=bas' },
    })
  })
})
