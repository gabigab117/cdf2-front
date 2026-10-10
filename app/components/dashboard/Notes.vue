<script setup lang="ts">
import { Lock } from '@lucide/vue'
import type { components } from '~/types/api'
import { NuxtLink } from '#components'

type LatestNoteOut = components['schemas']['LatestNoteOut']

// The board's latest notes, every event together: who wrote them, on which
// event, and how long ago.
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
    author: authorName(note.author),
    // « Halloween des enfants · il y a 2 h », or the time alone for a general note.
    meta: [note.event?.title, ago(note.created_at, now.value)].filter(Boolean).join(' · '),
    text: note.text,
    path: note.event ? eventPath(note.event.id) : null,
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
        <component
          :is="item.path ? NuxtLink : 'div'"
          :to="item.path ?? undefined"
          class="flex gap-3 px-5.5 py-3.5 text-sable-950"
          :class="{ 'transition-colors hover:bg-argent-25': item.path }"
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
        </component>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="px-5.5 py-6 text-center text-sm text-argent-600"
    >
      Aucune note pour l’instant.
    </p>
  </UiCard>
</template>
