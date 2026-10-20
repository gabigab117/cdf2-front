<script setup lang="ts">
import { Lock } from '@lucide/vue'
import type { components } from '~/types/api'

type LatestNoteOut = components['schemas']['LatestNoteOut']

// The board's latest notes, every event together: who wrote them, on which
// event, and how long ago. Each leads where it is written and managed: its
// event, or the page of the general notes.
const { notes, loading = false } = defineProps<{
  notes: LatestNoteOut[]
  /** The notes are on their way: the block says nothing of them yet. */
  loading?: boolean
}>()

const { ago } = useDateFormat()
const now = useNow()

const items = computed(() =>
  notes.map(note => ({
    id: note.id,
    author: memberSignature(note.author),
    // « Halloween des enfants · il y a 2 h », or the time alone for a general note.
    meta: [note.event?.title, ago(note.created_at, now.value)].filter(Boolean).join(' · '),
    text: note.text,
    path: note.event ? eventPath(note.event.id) : GENERAL_NOTES_PATH,
  })),
)
</script>

<template>
  <UiCard
    flush
    title="Notes du bureau"
    :aria-busy="loading || undefined"
  >
    <template #actions>
      <Lock
        :size="14"
        role="img"
        aria-label="Privé"
        class="text-argent-600"
      />
    </template>
    <ul
      v-if="items.length > 0"
      class="py-1.5"
    >
      <li
        v-for="item in items"
        :key="item.id"
      >
        <NuxtLink
          :to="item.path"
          class="flex gap-3 px-5.5 py-3.5 text-sable-950 transition-colors hover:bg-argent-25"
        >
          <UiAvatar
            :name="item.author"
            size="sm"
            tone="neutral"
          />
          <span class="flex min-w-0 flex-col gap-1">
            <span class="flex flex-wrap items-baseline gap-x-1.5 text-note">
              <span class="font-semibold">{{ item.author }}</span>
              <span class="text-argent-600">{{ item.meta }}</span>
            </span>
            <span class="line-clamp-3 text-ui whitespace-pre-line text-sable-600">{{ item.text }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="px-5.5 py-6 text-center text-sm text-argent-600"
    >
      Aucune note pour l’instant.
    </p>
    <div class="border-t border-argent-100 px-5.5 py-3">
      <UiButton
        variant="link"
        :to="GENERAL_NOTES_PATH"
      >
        Voir les notes générales
      </UiButton>
    </div>
  </UiCard>
</template>
