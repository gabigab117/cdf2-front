/**
 * Private by default: a page that has not declared itself public is reserved to
 * the board's members.
 *
 * Without an access token in memory, as after a reload, the session is renewed
 * once with the refresh cookie; a session the server refuses sends the member to
 * sign in, then back here.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // An unknown address is no page at all: Nuxt answers it with its 404 once the
  // middleware have run.
  if (to.matched.length === 0) return

  if (to.meta.public) {
    // The sign-in page is the board's way in, kept as a bookmark: a member whose
    // session is still open goes straight through.
    if (import.meta.client && to.path === SIGN_IN_PATH && await sessionResumes()) {
      return navigateTo(safeRedirect(to.query.redirect))
    }
    return
  }

  // A session only exists in the browser, where the private pages are rendered
  // (routeRules). A private page rendered on the server would stay closed.
  if (import.meta.server) return navigateTo(signInLocation(to.fullPath))

  const session = useSessionStore()
  if (session.accessToken) return
  try {
    if (await session.renew() === 'renewed') return
  }
  catch {
    // Throttled, server error, network failure: the session may still be valid,
    // so the member is not sent to sign in again.
    return abortNavigation(createError({
      status: 503,
      statusText: 'Service Unavailable',
      fatal: true,
      data: { path: to.fullPath },
    }))
  }
  return navigateTo(signInLocation(to.fullPath))
})

// The session in memory, or the one the refresh cookie brings back. A renewal
// that fails for the time being leaves the member the sign-in form.
async function sessionResumes(): Promise<boolean> {
  const session = useSessionStore()
  if (session.accessToken) return true
  try {
    return await session.renew() === 'renewed'
  }
  catch {
    return false
  }
}
