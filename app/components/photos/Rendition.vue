<script setup lang="ts">
import { ImageOff } from '@lucide/vue'
import type { components } from '~/types/api'

type PhotoRendition = components['schemas']['PhotoRendition']

// A size of a photo of the board, read with the session's token: an <img> alone
// would not send it. It fills its frame; leaving, it cancels its reading, or
// releases its URL. A parent whose photo changes keys it by its photo.
const { photo, rendition = 'thumbnail', alt = '', fit = 'cover' } = defineProps<{
  photo: number
  rendition?: PhotoRendition
  /** Left empty where the photo's frame names it. */
  alt?: string
  /** Cut to its frame, as a tile; or whole, as the viewer shows it. */
  fit?: 'cover' | 'contain'
}>()

const { readPhotoFile } = usePhotoWrites()

const url = ref<string | null>(null)
const failed = ref(false)
// An album's grid leaves with up to 300 readings under way: they stop with it.
const reading = new AbortController()

onMounted(async () => {
  const result = await readPhotoFile(photo, rendition, reading.signal)
  if (reading.signal.aborted) return
  if ('failure' in result) failed.value = true
  else url.value = URL.createObjectURL(result.file)
})

onBeforeUnmount(() => {
  reading.abort()
  if (url.value) URL.revokeObjectURL(url.value)
})

const classes = {
  fit: { cover: 'object-cover', contain: 'object-contain' },
  waiting: 'motion-safe:animate-pulse',
}

const imageClasses = computed(() => ['size-full transition-opacity duration-300 starting:opacity-0', classes.fit[fit]])
const placeholderClasses = computed(() => (failed.value ? '' : classes.waiting))
</script>

<template>
  <img
    v-if="url"
    :src="url"
    :alt
    :class="imageClasses"
  >
  <span
    v-else
    aria-hidden="true"
    class="flex size-full items-center justify-center bg-argent-100 text-argent-400"
    :class="placeholderClasses"
  >
    <ImageOff
      v-if="failed"
      :size="20"
    />
  </span>
</template>
