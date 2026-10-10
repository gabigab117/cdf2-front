import type { components } from '~/types/api'

type NoteTag = components['schemas']['NoteTag']
type BoardMemberOut = components['schemas']['BoardMemberOut']

/** What a member writes: a text, and a tag for a note. */
export interface NoteDraft {
  text: string
  tag: NoteTag | null
}

/** The tags of a note, with the tone of their pill. The API only knows their keys. */
export const NOTE_TAGS: Readonly<Record<NoteTag, { label: string, tone: 'azur' | 'neutral' }>> = {
  minutes: { label: 'Compte rendu', tone: 'neutral' },
  budget: { label: 'Budget', tone: 'azur' },
  logistics: { label: 'Logistique', tone: 'neutral' },
}

/** The choices of a note's tag, none first: a note may go without. */
export const NOTE_TAG_OPTIONS: ReadonlyArray<{ value: NoteTag | null, label: string }> = [
  { value: null, label: 'Sans étiquette' },
  ...Object.entries(NOTE_TAGS).map(([value, { label }]) => ({ value: value as NoteTag, label })),
]

/** How a note names its author: « Julie R. », or « Ancien membre » once the account is deleted. */
export function authorName(author: BoardMemberOut | null): string {
  return author ? memberShortName(author) : 'Ancien membre'
}

const NOTE_FIELD_LABELS: Readonly<Record<string, string>> = {
  event: 'Événement',
  text: 'Texte',
  tag: 'Étiquette',
  pinned: 'Épinglée',
}

/** The name of a field of a note, for an error the form cannot show under it. */
export function noteFieldLabel(path: string): string {
  return NOTE_FIELD_LABELS[path] ?? path
}
