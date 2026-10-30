<script setup lang="ts">
import type { components } from '~/types/api'

type AlbumOut = components['schemas']['AlbumOut']

definePageMeta({ path: '/bureau/photos', fullWidth: true })

useHead({ title: 'Photos' })

const route = useRoute()
const query = computed(() => parsePhotosQuery(route.query))

const { data: page, pending: loading, error, refresh } = usePhotoAlbums()

const albums = computed(() => page.value?.items ?? [])

// Below 820 px (`md`), the album replaces the list, which shows alone until one
// is chosen; wider, the latest album shows beside it. Read in the window, so that
// a phone reads no album, and no photo, it would hide.
const WIDE = window.matchMedia('(min-width: 51.25rem)')
const wide = ref(WIDE.matches)

function resized(event: MediaQueryListEvent): void {
  wide.value = event.matches
}

WIDE.addEventListener('change', resized)
onBeforeUnmount(() => WIDE.removeEventListener('change', resized))

const shown = computed(() => query.value.album ?? (wide.value ? albums.value[0]?.id ?? null : null))

async function created(album: AlbumOut): Promise<void> {
  await navigateTo(albumLocation(album.id))
  void refresh()
}

async function deleted(): Promise<void> {
  await navigateTo(albumLocation(null))
  void refresh()
}
</script>

<template>
  <div class="flex min-w-0 flex-1">
    <h1
      v-if="shown === null"
      class="sr-only"
    >
      Photos
    </h1>
    <div
      class="w-full shrink-0 border-argent-200 px-4 pt-6 pb-10 md:w-75 md:border-r md:pt-6"
      :class="{ 'max-md:hidden': query.album !== null }"
    >
      <BoardLoadError
        v-if="error"
        :message="error.message"
        @retry="refresh()"
      />
      <PhotosAlbumList
        v-else
        :albums
        :selected="shown"
        :loading
        @created="created"
      />
    </div>
    <PhotosAlbum
      v-if="shown !== null"
      :id="shown"
      :key="shown"
      @changed="refresh()"
      @deleted="deleted"
    />
  </div>
</template>
