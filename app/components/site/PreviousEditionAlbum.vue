<script setup lang="ts">
import type { components } from '~/types/api'

const { album } = defineProps<{ album: components['schemas']['PublicAlbumOut'] }>()

const link = computed(() => `Album ${album.title} · ${photosText(album.photos_count)}`)

// Its first photos; the last one shown tells how many more the album holds.
const tiles = computed(() =>
  album.photos.map((photo, index) => ({
    photo,
    more: index === album.photos.length - 1 ? album.photos_count - album.photos.length : 0,
  })),
)
</script>

<!-- « L'an dernier »: the album of the event's previous edition, its first photos. -->
<template>
  <section
    aria-labelledby="previous-edition"
    class="flex flex-col gap-6"
  >
    <div class="flex flex-wrap items-end justify-between gap-4">
      <SiteBlockTitle id="previous-edition">
        L’an dernier
      </SiteBlockTitle>
      <SiteArrowLink
        :to="publicAlbumPath(album.slug)"
        :label="link"
      />
    </div>
    <ul class="grid grid-cols-previous-edition gap-2.5">
      <li
        v-for="tile in tiles"
        :key="tile.photo"
        class="relative aspect-square overflow-hidden rounded-2xl bg-argent-100"
      >
        <SitePhoto
          :photo="tile.photo"
          rendition="thumbnail"
          lazy
        />
        <span
          v-if="tile.more"
          class="absolute inset-0 flex items-center justify-center bg-sable-950/60 text-lg font-semibold text-white"
          aria-hidden="true"
        >+{{ tile.more }}</span>
      </li>
    </ul>
  </section>
</template>
