import type { components } from '~/types/api'

/** How the board names one of its members. */
type Named = Pick<components['schemas']['BoardMemberOut'], 'first_name' | 'last_name' | 'email'>

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
