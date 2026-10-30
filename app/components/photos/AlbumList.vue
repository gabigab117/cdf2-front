<script setup lang="ts">
import { Plus } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type AlbumIn = components['schemas']['AlbumIn']
type AlbumItemOut = components['schemas']['AlbumItemOut']
type AlbumOut = components['schemas']['AlbumOut']

// The column of the albums, the latest first, and « + » for a new album, whose
// form unfolds above them.
const { albums, selected, loading = false } = defineProps<{
  albums: readonly AlbumItemOut[]
  /** The album the page shows beside the list, if any. */
  selected: number | null
  loading?: boolean
}>()

const emit = defineEmits<{ created: [album: AlbumOut] }>()

const { createAlbum } = usePhotoWrites()

const creating = ref(false)
const headingId = useId()

async function create(fields: AlbumIn): Promise<FormErrors | null> {
  const result = await createAlbum(fields)
  if (result.data) emit('created', result.data)
  return result.errors
}
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="flex flex-col gap-4"
  >
    <div class="flex items-center justify-between gap-3">
      <h2
        :id="headingId"
        class="text-body font-semibold"
      >
        Albums
      </h2>
      <UiIconButton
        label="Nouvel album"
        size="sm"
        :aria-expanded="creating"
        @click="creating = !creating"
      >
        <Plus :size="16" />
      </UiIconButton>
    </div>
    <UiCard v-if="creating">
      <PhotosAlbumForm
        :save="create"
        @saved="creating = false"
        @cancel="creating = false"
      />
    </UiCard>
    <ul
      v-if="albums.length > 0"
      :aria-busy="loading || undefined"
      class="flex flex-col gap-1"
    >
      <li
        v-for="album in albums"
        :key="album.id"
      >
        <PhotosAlbumRow
          :album
          :selected="album.id === selected"
          :to="albumLocation(album.id)"
        />
      </li>
    </ul>
    <UiEmptyState v-else-if="!loading">
      Aucun album pour l’instant : créez le premier avec « + ».
    </UiEmptyState>
  </section>
</template>
