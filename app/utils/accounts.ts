import type { components } from '~/types/api'

type BoardPosition = components['schemas']['BoardPosition']
type AccountOut = components['schemas']['AccountOut']

/** The accounts page, the superuser's alone. */
export const ACCOUNTS_PATH = '/bureau/membres'

/** Where a member chooses their password, from the link of an email. */
export const SET_PASSWORD_PATH = '/choisir-mot-de-passe'

/** How many accounts a page of the list shows. */
export const ACCOUNTS_PAGE_SIZE = 25

/** The positions of the board, in the order of the list (decision of 10/10/2026). */
export const BOARD_POSITIONS: Readonly<Record<BoardPosition, string>> = {
  president: 'Président·e',
  vice_president: 'Vice-président·e',
  treasurer: 'Trésorier·e',
  assistant_treasurer: 'Trésorier·e adjoint·e',
  secretary: 'Secrétaire',
  assistant_secretary: 'Secrétaire adjoint·e',
}

/**
 * « Aucune fonction », a choice of its own: an empty value is kept for the
 * prompt of a select (UiSelect), and none is sent as null.
 */
export const NO_POSITION = 'none'

export type PositionChoice = BoardPosition | typeof NO_POSITION

/** The options of the position, « Aucune fonction » first. */
export const POSITION_OPTIONS: ReadonlyArray<{ value: PositionChoice, label: string }> = [
  { value: NO_POSITION, label: 'Aucune fonction' },
  ...(Object.entries(BOARD_POSITIONS) as Array<[BoardPosition, string]>).map(([value, label]) => ({ value, label })),
]

/** The link of an email, as the page reads it after its « # »: `uid.token`. */
export function passwordLink(hash: string): { uid: string, token: string } | null {
  const [uid, token, ...rest] = hash.replace(/^#/, '').split('.')
  return uid && token && rest.length === 0 ? { uid, token } : null
}

/** The pill of an account's state, its invitation dated by `day`. */
export function accountPill(
  account: Pick<AccountOut, 'state' | 'link_sent_at'>,
  day: (iso: string) => string,
): { label: string, tone: 'azur' | 'ambre' | 'alert' | 'neutral' } {
  if (account.state === 'inactive') return { label: 'Désactivé', tone: 'neutral' }
  if (account.state === 'active') return { label: 'Actif', tone: 'azur' }
  return account.link_sent_at
    ? { label: `Invitation envoyée le ${day(account.link_sent_at)}`, tone: 'ambre' }
    : { label: 'Lien non envoyé', tone: 'alert' }
}
