<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type AlbumIn = components['schemas']['AlbumIn']
type PhotoOut = components['schemas']['PhotoOut']

// An album of the Photos page: its head, or its form while it is corrected, its
// drop zone, the grid of its photos and the bar of its selection. The selection
// covers the whole album, 300 photos at most (D17); it is kept by id, so that
// the album fetched again after a write keeps it.
const { id } = defineProps<{ id: number }>()

const emit = defineEmits<{ changed: [], deleted: [] }>()

const { data: album, pending: loading, error, refresh } = usePhotoAlbum(id)
const { updateAlbum, deleteAlbum } = usePhotoWrites()

const editing = ref(false)
const selected = ref<ReadonlySet<number>>(new Set())
const viewedId = ref<number | null>(null)
const viewing = ref(false)
const upload = useTemplateRef<{ choose: () => void }>('upload')

const photos = computed(() => album.value?.photos ?? [])
const selection = computed(() => photos.value.filter(photo => selected.value.has(photo.id)))
const selectable = computed(() => photos.value.length > 0 && selection.value.length < photos.value.length)
const viewed = computed(() => photos.value.find(photo => photo.id === viewedId.value) ?? null)

function toggle(photo: PhotoOut): void {
  const next = new Set(selected.value)
  if (!next.delete(photo.id)) next.add(photo.id)
  selected.value = next
}

function selectAll(): void {
  selected.value = new Set(photos.value.map(photo => photo.id))
}

function clear(): void {
  selected.value = new Set()
}

// The viewer mounts with its photo, then opens: a modal opens on a change.
async function enlarge(photo: PhotoOut): Promise<void> {
  viewedId.value = photo.id
  await nextTick()
  viewing.value = true
}

// A write changes the album, and what the list shows of it: its number of
// photos, its cover, whether the site shows it.
async function changed(): Promise<void> {
  await refresh()
  emit('changed')
}

async function deletedPhotos(): Promise<void> {
  clear()
  await changed()
}

async function save(fields: AlbumIn): Promise<FormErrors | null> {
  return (await updateAlbum(id, fields)).errors
}

function remove(): Promise<string | null> {
  return deleteAlbum(id)
}

async function saved(): Promise<void> {
  editing.value = false
  await changed()
}
</script>

<template>
  <div
    class="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-6 pb-30 md:px-8 md:pt-7"
    :aria-busy="loading || undefined"
  >
    <UiButton
      variant="link"
      class="self-start md:hidden"
      :to="albumLocation(null)"
    >
      <ArrowLeft :size="16" />
      Albums
    </UiButton>
    <BoardLoadError
      v-if="error"
      :message="error.message"
      @retry="refresh()"
    />
    <template v-else-if="album">
      <UiCard v-if="editing">
        <PhotosAlbumForm
          :album
          :save
          :remove
          @saved="saved"
          @cancel="editing = false"
          @deleted="emit('deleted')"
        />
      </UiCard>
      <PhotosAlbumHeader
        v-else
        :album
        @edit="editing = true"
        @add="upload?.choose()"
        @changed="changed"
      />
      <PhotosUploadZone
        ref="upload"
        :album-id="id"
        @uploaded="changed"
      />
      <UiButton
        v-if="selectable"
        variant="link"
        class="self-end"
        @click="selectAll"
      >
        Tout sélectionner
      </UiButton>
      <PhotosGrid
        v-if="photos.length > 0"
        :photos
        :cover="album.cover"
        :selected
        enlargeable
        @toggle="toggle"
        @enlarge="enlarge"
      />
      <UiEmptyState v-else>
        Aucune photo dans cet album pour l’instant.
      </UiEmptyState>
      <PhotosSelectionBar
        v-if="selection.length > 0"
        :album
        :photos="selection"
        @clear="clear"
        @changed="changed"
        @deleted="deletedPhotos"
      />
      <PhotosViewer
        v-if="viewed"
        v-model:open="viewing"
        :photo="viewed"
        :cover="viewed.id === album.cover"
      />
    </template>
  </div>
</template>
