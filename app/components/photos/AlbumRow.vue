<script setup lang="ts">
import { Eye, Image, Lock } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type AlbumItemOut = components['schemas']['AlbumItemOut']

// An album of a list, as the mockup's column shows it: its cover, its number of
// photos and its day, and an eye when the site shows it. A private album shows a
// padlock in place of its cover, and « privé » in place of its day.
const { album, selected = false, to } = defineProps<{
  album: AlbumItemOut
  /** The album the page shows beside the list. */
  selected?: boolean
  to: RouteLocationRaw
}>()

const now = useNow()
const { calendarDay } = useDateFormat()

const meta = computed(() =>
  `${photosText(album.photos_count)} · ${album.published ? calendarDay(album.date, now.value) : 'privé'}`)

// The link says it is the album shown: the router would mark every album of the
// page as such, whatever its query.
const current = computed(() => (selected ? 'true' : undefined))

const classes = {
  base: 'flex items-center gap-3 rounded-search p-2 transition-colors',
  selected: 'bg-white ring-1 ring-argent-200',
  idle: 'hover:bg-white',
  cover: 'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-icon',
  private: 'bg-argent-100 text-argent-600',
  public: 'bg-argent-150 text-argent-400',
}

const rowClasses = computed(() => [classes.base, selected ? classes.selected : classes.idle])
const coverClasses = computed(() => [classes.cover, album.published ? classes.public : classes.private])
</script>

<template>
  <NuxtLink
    :to
    :aria-current="current"
    :class="rowClasses"
  >
    <span :class="coverClasses">
      <Lock
        v-if="!album.published"
        :size="18"
      />
      <PhotosRendition
        v-else-if="album.cover !== null"
        :key="album.cover"
        :photo="album.cover"
      />
      <Image
        v-else
        :size="18"
      />
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="truncate text-ui font-semibold">{{ album.title }}</span>
      <span class="truncate text-label text-argent-600">{{ meta }}</span>
    </span>
    <Eye
      v-if="album.published"
      :size="16"
      role="img"
      aria-label="Public"
      class="shrink-0 text-azur-600"
    />
  </NuxtLink>
</template>
