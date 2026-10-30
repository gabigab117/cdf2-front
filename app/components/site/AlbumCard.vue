<script setup lang="ts">
import type { components } from '~/types/api'

const { album } = defineProps<{ album: components['schemas']['PublicAlbumItemOut'] }>()

const { calendarLong } = useDateFormat()
</script>

<!-- An album of the site: its cover, its number of photos, its title and its
day. A phone shows its cover and its title only. The cover comes first on the
screen, the title first in the link's name. -->
<template>
  <NuxtLink
    :to="publicAlbumPath(album.slug)"
    class="flex flex-col gap-2 text-sable-950 md:gap-3.5"
  >
    <span class="flex flex-col gap-0.5">
      <span class="text-body font-semibold md:text-title">{{ album.title }}</span>
      <span class="text-sm text-argent-600 max-md:hidden">{{ calendarLong(album.date) }}</span>
    </span>
    <span class="relative order-first aspect-4/5 overflow-hidden rounded-banner bg-argent-100 md:rounded-card">
      <SitePhoto
        :photo="album.cover"
        rendition="thumbnail"
        lazy
      />
      <UiStatusPill
        tone="light"
        size="lg"
        class="absolute bottom-3.5 left-3.5 max-md:hidden"
      >
        {{ photosText(album.photos_count) }}
      </UiStatusPill>
    </span>
  </NuxtLink>
</template>
