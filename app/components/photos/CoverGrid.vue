<script setup lang="ts">
import type { components } from '~/types/api'

type PhotoOut = components['schemas']['PhotoOut']

// The photos of one album, to choose an event's cover from: a single photo is
// pressed, the one chosen. The album's own cover is not marked: it is not the
// event's. Keyed by its album.
const { albumId, choice } = defineProps<{
  albumId: number
  /** The photo chosen, if any. */
  choice: number | null
}>()

const emit = defineEmits<{ choose: [photo: PhotoOut] }>()

const { data: album, pending: loading, error, refresh } = usePhotoAlbum(albumId)

const photos = computed(() => album.value?.photos ?? [])
const chosen = computed<ReadonlySet<number>>(() => new Set(choice === null ? [] : [choice]))
</script>

<template>
  <BoardLoadError
    v-if="error"
    :message="error.message"
    @retry="refresh()"
  />
  <div
    v-else
    :aria-busy="loading || undefined"
  >
    <PhotosGrid
      v-if="photos.length > 0"
      :photos
      :selected="chosen"
      @toggle="emit('choose', $event)"
    />
    <UiEmptyState v-else-if="!loading">
      Aucune photo dans cet album.
    </UiEmptyState>
  </div>
</template>
