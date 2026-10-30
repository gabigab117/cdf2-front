<script setup lang="ts">
import type { components } from '~/types/api'

type AlbumItemOut = components['schemas']['AlbumItemOut']
type EventOut = components['schemas']['EventOut']

// The choice of an event's cover, above the page: one of the albums offered, the
// event's and its previous edition's, then one of its photos (D17). The cover
// already chosen comes pressed.
const open = defineModel<boolean>('open', { default: false })

const { event, choices, cover } = defineProps<{
  event: Pick<EventOut, 'id' | 'title'>
  /** The albums the cover is chosen from, the latest first. */
  choices: readonly AlbumItemOut[]
  /** The photo of the cover, if any. */
  cover: number | null
}>()

const emit = defineEmits<{ chosen: [] }>()

const { setEventCover } = usePhotoWrites()
const now = useNow()
const { calendarDay } = useDateFormat()

const albumId = ref<number | null>(choices[0]?.id ?? null)
const choice = ref<number | null>(cover)
const pending = ref(false)
const failure = ref<string | null>(null)

const options = computed(() => choices.map(album => ({
  value: album.id,
  label: [
    album.title,
    calendarDay(album.date, now.value),
    album.event?.id === event.id ? null : 'édition précédente',
  ].filter(Boolean).join(' · '),
})))

watch(open, (isOpen) => {
  if (!isOpen) return
  choice.value = cover
  failure.value = null
})

async function choose(): Promise<void> {
  pending.value = true
  failure.value = await setEventCover(event.id, choice.value)
  pending.value = false
  if (failure.value) return
  open.value = false
  emit('chosen')
}
</script>

<template>
  <UiModal
    v-model:open="open"
    title="Choisir la couverture"
    :subtitle="event.title"
  >
    <template #actions>
      <UiButton
        variant="accent"
        size="sm"
        :disabled="choice === null"
        :loading="pending"
        @click="choose"
      >
        Choisir
      </UiButton>
    </template>
    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <UiField
        v-slot="{ control }"
        label="Album"
        class="max-w-md"
      >
        <UiSelect
          v-bind="control"
          v-model="albumId"
          :options
        />
      </UiField>
      <UiAlertText v-if="failure">
        {{ failure }}
      </UiAlertText>
      <PhotosCoverGrid
        v-if="albumId !== null"
        :key="albumId"
        :album-id="albumId"
        :choice
        @choose="choice = $event.id"
      />
    </div>
  </UiModal>
</template>
