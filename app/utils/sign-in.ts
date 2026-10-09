import type { RouteLocationRaw } from 'vue-router'

/** Where a board member signs in. */
export const SIGN_IN_PATH = '/connexion'

/** Where a board member lands after signing in, unless they were on their way elsewhere. */
export const BOARD_HOME_PATH = '/bureau'

// Any origin serves: only whether an address stays on it matters.
const SAME_SITE = 'http://localhost'

/** The sign-in page, which brings the member back to `redirect` once signed in. */
export function signInLocation(redirect: string): RouteLocationRaw {
  return { path: SIGN_IN_PATH, query: { redirect } }
}

/**
 * The page to open once signed in: the requested one when it is a page of this
 * site, the board's home otherwise.
 *
 * An address on another site would turn the sign-in page into a springboard for
 * phishing. The URL parser applies the browser's own rules, so that
 * "//other.example", "/\other.example" or a tab slipped into the address land
 * where the browser would take them.
 */
export function safeRedirect(target: unknown): string {
  if (typeof target !== 'string') return BOARD_HOME_PATH
  const url = URL.parse(target, SAME_SITE)
  if (url?.origin !== SAME_SITE || url.pathname === SIGN_IN_PATH) return BOARD_HOME_PATH
  return `${url.pathname}${url.search}${url.hash}`
}
