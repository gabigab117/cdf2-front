import type { components } from '~/types/api'
import type { Option } from '~/utils/options'

type NoteTag = components['schemas']['NoteTag']

/** The general notes, those without an event (A11). */
export const GENERAL_NOTES_PATH = '/bureau/notes'

/** How many notes a page of notes holds, an event's or the general ones. */
export const NOTES_PAGE_SIZE = 25

/** What a member writes: a text, and a tag and a file to attach for a note. */
export interface NoteDraft {
  text: string
  tag: NoteTag | null
  /** The file attached to a new note, uploaded as a document of the board. */
  file?: File | null
}

/** The tags of a note, with the tone of their pill. The API only knows their keys. */
export const NOTE_TAGS: Readonly<Record<NoteTag, { label: string, tone: 'azur' | 'neutral' }>> = {
  minutes: { label: 'Compte rendu', tone: 'neutral' },
  budget: { label: 'Budget', tone: 'azur' },
  logistics: { label: 'Logistique', tone: 'neutral' },
}

/** The choices of a note's tag, none first: a note may go without. */
export const NOTE_TAG_OPTIONS: readonly Option<NoteTag | null>[] = [
  { value: null, label: 'Sans étiquette' },
  ...keysOf(NOTE_TAGS).map(value => ({ value, label: NOTE_TAGS[value].label })),
]

const NOTE_FIELD_LABELS: Readonly<Record<string, string>> = {
  file: 'Pièce jointe',
  document: 'Pièce jointe',
  event: 'Événement',
  text: 'Texte',
  tag: 'Étiquette',
  pinned: 'Épinglée',
}

/** The name of a field of a note, for an error the form cannot show under it. */
export function noteFieldLabel(path: string): string {
  return NOTE_FIELD_LABELS[path] ?? path
}
