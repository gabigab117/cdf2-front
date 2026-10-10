<script setup lang="ts">
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'
import type { NoteDraft } from '~/utils/notes'

type NoteOut = components['schemas']['NoteOut']

const { note, leadId } = defineProps<{
  note: NoteOut
  /** The event's lead, whose avatar stands out. */
  leadId: number | null
}>()

const emit = defineEmits<{ changed: [] }>()

const { replyTo } = useNoteWrites()

// The replies fold under their note, as « 2 réponses » in the mockup.
const open = ref(false)
const panelId = useId()

const toggle = computed(() => {
  const count = note.replies.length
  if (count === 0) return 'Répondre'
  return count === 1 ? '1 réponse' : `${count} réponses`
})

function send({ text }: NoteDraft): Promise<FormErrors | null> {
  return replyTo(note.id, { text })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UiButton
      variant="link"
      class="self-start"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="open = !open"
    >
      {{ toggle }}
    </UiButton>
    <div
      v-if="open"
      :id="panelId"
      class="flex flex-col gap-4 border-l-2 border-argent-100 pl-4"
    >
      <ul
        v-if="note.replies.length > 0"
        class="flex flex-col gap-4"
      >
        <li
          v-for="reply in note.replies"
          :key="reply.id"
        >
          <NotesReply
            :reply
            :lead-id
            @changed="emit('changed')"
          />
        </li>
      </ul>
      <NotesForm
        label="Réponse à la note"
        placeholder="Répondre à la note…"
        action="Répondre"
        :save="send"
        @saved="emit('changed')"
      />
    </div>
  </div>
</template>
