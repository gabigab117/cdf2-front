<script setup lang="ts">
import type { components } from '~/types/api'

const { album } = defineProps<{ album: components['schemas']['PublicAlbumOut'] }>()

// Each photo is a link to its large size: without JavaScript, the browser opens
// it. With it, the viewer opens above the page instead.
const viewed = ref<number | null>(null)
const viewing = ref(false)

// The viewer mounts with its photo, then opens: a modal opens as its `open` changes.
async function view(index: number): Promise<void> {
  viewed.value = index
  await nextTick()
  viewing.value = true
}

const tiles = computed(() =>
  album.photos.map((photo, index) => ({
    photo,
    index,
    label: `Agrandir la photo ${index + 1} sur ${album.photos.length}`,
  })),
)
</script>

<template>
  <ul class="grid grid-cols-photos gap-2.5 md:gap-3">
    <li
      v-for="tile in tiles"
      :key="tile.photo"
    >
      <a
        :href="publicPhotoUrl(tile.photo, 'display')"
        :aria-label="tile.label"
        class="block aspect-square overflow-hidden rounded-2xl bg-argent-100"
        @click.prevent="view(tile.index)"
      >
        <SitePhoto
          :photo="tile.photo"
          rendition="thumbnail"
          lazy
        />
      </a>
    </li>
  </ul>
  <SitePhotoViewer
    v-if="viewed !== null"
    v-model:open="viewing"
    v-model:index="viewed"
    :album
  />
</template>
