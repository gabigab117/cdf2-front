<script setup lang="ts">
import { Pencil, Upload } from '@lucide/vue'
import type { components } from '~/types/api'

type AlbumOut = components['schemas']['AlbumOut']

// The head of an album: its title, its day, how many photos and members, and the
// switch that shows it on the site, the explicit gesture of D17. The switch
// follows the album; a publication refused puts it back.
const { album } = defineProps<{ album: AlbumOut }>()

const emit = defineEmits<{ edit: [], add: [], changed: [] }>()

const { publishAlbum } = usePhotoWrites()
const now = useNow()
const { calendarInWords } = useDateFormat()

const published = ref(album.published)
const pending = ref(false)
const failure = ref<string | null>(null)

watch(() => album.published, (value) => {
  published.value = value
})

const subtitle = computed(() =>
  [
    capitalized(calendarInWords(album.date, now.value, { weekday: true })),
    photosText(album.photos_count),
    contributorsText(album),
  ].filter(Boolean).join(' · '))

async function publish(value: boolean): Promise<void> {
  pending.value = true
  failure.value = await publishAlbum(album.id, value)
  pending.value = false
  if (failure.value) published.value = album.published
  else emit('changed')
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-2">
        <BoardPageTitle>{{ album.title }}</BoardPageTitle>
        <p class="text-ui text-argent-600">
          {{ subtitle }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <UiSwitch
          v-model="published"
          label="Visible sur le site"
          :disabled="pending"
          @update:model-value="publish"
        />
        <UiButton
          variant="secondary"
          @click="emit('edit')"
        >
          <Pencil :size="16" />
          Modifier
        </UiButton>
        <UiButton @click="emit('add')">
          <Upload :size="18" />
          Ajouter des photos
        </UiButton>
      </div>
    </div>
    <UiAlertText v-if="failure">
      {{ failure }}
    </UiAlertText>
  </div>
</template>
