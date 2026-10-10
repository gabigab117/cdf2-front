import type { components } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type AccountIn = components['schemas']['AccountIn']
type InvitationOut = components['schemas']['InvitationOut']
type PasswordIn = components['schemas']['PasswordIn']
type PasswordLinkIn = components['schemas']['PasswordLinkIn']
type PasswordLinkOut = components['schemas']['PasswordLinkOut']

/** The accounts of the board, by page: the superuser's alone. Lazy. */
export function useAccounts(page: () => number) {
  return useLazyAsyncData(
    () => `board:accounts:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/accounts', { params: { query: { page: page(), page_size: ACCOUNTS_PAGE_SIZE } }, signal })),
  )
}

/** The superuser's writes on the accounts: each tells whether its email went out. */
export function useAccountWrites() {
  const api = useApi()

  /** « Inviter un membre »: the account is made, then its link sent. */
  function inviteMember(payload: AccountIn): Promise<Written<InvitationOut>> {
    return formWrite(api.POST('/api/board/accounts', { body: payload }))
  }

  /** « Envoyer un nouveau lien »: an invitation again, or a password forgotten. */
  function sendNewLink(id: number): Promise<Written<InvitationOut>> {
    return formWrite(api.POST('/api/board/accounts/{account_id}/link', { params: { path: { account_id: id } } }))
  }

  return { inviteMember, sendNewLink }
}

/** The page where a member chooses their password: two public operations. */
export function usePasswordWrites() {
  const api = useApi()

  /** The account a link leads to, while it holds. */
  function checkLink(link: PasswordLinkIn): Promise<Written<PasswordLinkOut>> {
    return formWrite(api.POST('/api/auth/password-link', { body: link }))
  }

  function choosePassword(payload: PasswordIn): Promise<Written<PasswordLinkOut>> {
    return formWrite(api.POST('/api/auth/password', { body: payload }))
  }

  return { checkLink, choosePassword }
}
