<script setup lang="ts">
import type { components } from '~/types/api'

type PhotoOut = components['schemas']['PhotoOut']

// The photos of an album, in square tiles of 160 px at least, as many as a row
// holds: an album's page selects them, the cover's choice picks one.
const { photos, cover = null, selected, enlargeable = false } = defineProps<{
  photos: readonly PhotoOut[]
  /** The photo that is its album's cover, if any. */
  cover?: number | null
  selected: ReadonlySet<number>
  enlargeable?: boolean
}>()

const emit = defineEmits<{ toggle: [photo: PhotoOut], enlarge: [photo: PhotoOut] }>()
</script>

<template>
  <ul class="grid grid-cols-photos gap-3">
    <li
      v-for="(photo, index) in photos"
      :key="photo.id"
    >
      <PhotosTile
        :photo
        :place="index + 1"
        :selected="selected.has(photo.id)"
        :cover="photo.id === cover"
        :enlargeable
        @toggle="emit('toggle', photo)"
        @enlarge="emit('enlarge', photo)"
      />
    </li>
  </ul>
</template>
