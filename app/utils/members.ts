import type { components } from '~/types/api'
import type { Option } from '~/utils/options'

type BoardMemberOut = components['schemas']['BoardMemberOut']

/** How the board names one of its members. */
type Named = Pick<BoardMemberOut, 'first_name' | 'last_name' | 'email'>

/** « Julie Roux », or the address of an account created without a name. */
export function memberName({ first_name, last_name, email }: Named): string {
  return `${first_name} ${last_name}`.trim() || email
}

/** « Julie R. », as the board names a member in passing. */
export function memberShortName(member: Named): string {
  const { first_name, last_name } = member
  if (!first_name) return memberName(member)
  return last_name ? `${first_name} ${last_name.charAt(0)}.` : first_name
}

/**
 * How a note, a line or an advance names its member: « Julie R. », or « Ancien
 * membre » once the account is deleted.
 */
export function memberSignature(member: Named | null): string {
  return member ? memberShortName(member) : 'Ancien membre'
}

/**
 * « Bonjour Julie », or « Bonjour » alone for a member without a first name,
 * or while the member is not known yet.
 */
export function memberGreeting(member: Pick<Named, 'first_name'> | null): string {
  return member?.first_name ? `Bonjour ${member.first_name}` : 'Bonjour'
}

/**
 * The board members to choose from, by name, after the choice of nobody
 * (« Aucun », « Personne »): the lead of an event, the assignee of a task. The
 * member chosen so far stays among them, even after leaving the board:
 * otherwise, saving would take them off without anyone choosing so.
 */
export function memberOptions(
  members: readonly BoardMemberOut[],
  current: BoardMemberOut | null,
  nobody: string,
): Option<number | null>[] {
  return [{ value: null, label: nobody }, ...boardMemberOptions(members, current)]
}

/**
 * The board members to choose from, by name, the member chosen so far kept
 * among them even after leaving the board: who advanced an expense.
 */
export function boardMemberOptions(members: readonly BoardMemberOut[], current: BoardMemberOut | null): Option<number>[] {
  const chosen = current && !members.some(member => member.id === current.id) ? [...members, current] : members
  return chosen.map(member => ({ value: member.id, label: memberName(member) }))
}
