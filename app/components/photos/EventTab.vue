<script setup lang="ts">
import { ImagePlus, Plus } from '@lucide/vue'
import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type AlbumIn = components['schemas']['AlbumIn']
type EventOut = components['schemas']['EventOut']

// The « Photos » tab of an event: its albums, each leading to the Photos page,
// and a new one made for it; then its cover, chosen among the photos of its
// albums and of its previous edition's, which the site shows while its photo is
// visible (D17).
const { event } = defineProps<{ event: EventOut }>()

const { data: page, pending: loading, error, refresh } = usePhotoAlbums(event.id)
const { data: cover, error: coverError, refresh: refreshCover } = useEventCover(event.id)
const { createAlbum, setEventCover } = usePhotoWrites()

const albums = computed(() => page.value?.items ?? [])
const creating = ref(false)
const choosing = ref(false)
const pending = ref(false)
const failure = ref<string | null>(null)

const hidden = computed(() => cover.value?.cover != null && !cover.value.visible)
const hasChoices = computed(() => (cover.value?.albums.length ?? 0) > 0)

// A new album opens in the Photos page, where its photos are added.
async function create(fields: AlbumIn): Promise<FormErrors | null> {
  const result = await createAlbum(fields)
  if (result.data) await navigateTo(albumLocation(result.data.id))
  return result.errors
}

async function takeOff(): Promise<void> {
  pending.value = true
  failure.value = await setEventCover(event.id, null)
  pending.value = false
  if (!failure.value) await refreshCover()
}

async function chosen(): Promise<void> {
  failure.value = null
  await refreshCover()
}
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-5">
    <UiCard title="Albums">
      <template #actions>
        <UiButton
          variant="secondary"
          size="sm"
          :aria-expanded="creating"
          @click="creating = !creating"
        >
          <Plus :size="16" />
          Nouvel album
        </UiButton>
      </template>
      <PhotosAlbumForm
        v-if="creating"
        :event
        :save="create"
        @cancel="creating = false"
      />
      <BoardLoadError
        v-if="error"
        :message="error.message"
        @retry="refresh()"
      />
      <ul
        v-else-if="albums.length > 0"
        :aria-busy="loading || undefined"
        class="flex flex-col gap-1"
      >
        <li
          v-for="album in albums"
          :key="album.id"
        >
          <PhotosAlbumRow
            :album
            :to="albumLocation(album.id)"
          />
        </li>
      </ul>
      <p
        v-else-if="!loading"
        class="text-body text-argent-600"
      >
        Aucun album pour cet événement.
      </p>
    </UiCard>
    <UiCard title="Couverture de l’événement">
      <BoardLoadError
        v-if="coverError"
        :message="coverError.message"
        @retry="refreshCover()"
      />
      <template v-else-if="cover">
        <p class="text-body text-sable-600">
          Choisie parmi les photos des albums de l’événement et de son édition précédente. Le site ne la montre que si sa photo y est visible.
        </p>
        <div
          v-if="cover.cover !== null"
          class="aspect-3/2 w-full max-w-sm overflow-hidden rounded-2xl"
        >
          <PhotosRendition
            :key="cover.cover"
            :photo="cover.cover"
            alt="Couverture de l’événement"
          />
        </div>
        <p
          v-else
          class="text-body text-argent-600"
        >
          Aucune couverture pour l’instant.
        </p>
        <p
          v-if="hidden"
          class="text-note font-semibold text-ambre-800"
        >
          Le site ne la montre pas : son album est privé, ou la photo est masquée ou à vérifier.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton
            :disabled="!hasChoices"
            @click="choosing = true"
          >
            <ImagePlus :size="18" />
            Choisir la couverture
          </UiButton>
          <UiButton
            v-if="cover.cover !== null"
            variant="secondary"
            :loading="pending"
            @click="takeOff"
          >
            Retirer la couverture
          </UiButton>
        </div>
        <p
          v-if="!hasChoices"
          class="text-note text-argent-600"
        >
          Aucun album pour cet événement ni pour son édition précédente.
        </p>
        <UiAlertText v-if="failure">
          {{ failure }}
        </UiAlertText>
        <PhotosCoverPicker
          v-if="hasChoices"
          v-model:open="choosing"
          :event
          :choices="cover.albums"
          :cover="cover.cover"
          @chosen="chosen"
        />
      </template>
    </UiCard>
  </div>
</template>
