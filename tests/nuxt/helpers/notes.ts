import type { components } from '~/types/api'
import { julie } from './events'

type NoteOut = components['schemas']['NoteOut']
type ReplyOut = components['schemas']['ReplyOut']
type BoardMemberOut = components['schemas']['BoardMemberOut']

/** Another fictitious board member, who writes the notes of the tests. */
export const marc: BoardMemberOut = {
  id: 9,
  first_name: 'Marc',
  last_name: 'Dubois',
  email: 'marc.dubois@example.test',
}

/** A reply to a note, by Julie, on Thursday 24 September 2026. */
export function noteReply(changes: Partial<ReplyOut> = {}): ReplyOut {
  return {
    id: 41,
    author: julie,
    text: 'Je m’en occupe.',
    created_at: '2026-09-24T18:30:00Z',
    updated_at: '2026-09-24T18:30:00Z',
    editable: false,
    ...changes,
  }
}

/** A note of the board, by Marc, on Thursday 24 September 2026, without reply. */
export function boardNote(changes: Partial<NoteOut> = {}): NoteOut {
  return {
    id: 31,
    author: marc,
    text: 'Parcours validé : départ de la salle des fêtes.\nRetour par la place.',
    created_at: '2026-09-24T18:00:00Z',
    updated_at: '2026-09-24T18:00:00Z',
    editable: false,
    tag: 'minutes',
    pinned: false,
    replies: [],
    ...changes,
  }
}
