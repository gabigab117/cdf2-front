<script setup lang="ts">
import { Check, EyeOff, Maximize2, Star } from '@lucide/vue'
import type { components } from '~/types/api'

type PhotoOut = components['schemas']['PhotoOut']

// A photo of a grid, as the mockup draws it: a tile pressed to select it, its box
// checked, the badges of the cover and of a photo awaiting a check, a veil over
// a photo hidden from the site. « Agrandir », beside it, opens the viewer.
const { photo, place, selected, cover = false, enlargeable = false } = defineProps<{
  photo: PhotoOut
  /** Its place in the grid, from 1: « Photo 3 ». */
  place: number
  selected: boolean
  /** The photo is its album's cover. */
  cover?: boolean
  enlargeable?: boolean
}>()

const emit = defineEmits<{ toggle: [], enlarge: [] }>()

const name = computed(() => `Photo ${place}`)
const enlargeLabel = computed(() => `Agrandir la photo ${place}`)

const classes = {
  tile: 'relative block aspect-square w-full overflow-hidden rounded-2xl bg-argent-100 transition-shadow',
  selected: 'ring-3 ring-azur-600',
  idle: 'ring-1 ring-sable-950/6',
  box: 'absolute top-2.5 left-2.5 flex size-6.5 items-center justify-center rounded-lg',
  checked: 'bg-azur-600 text-white',
  unchecked: 'border border-sable-950/18 bg-white/85',
  // Shown as a mouse passes over the tile, or the keyboard reaches it; always
  // on a touch screen, which has no hover.
  enlarge: 'absolute top-2 right-2 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100',
}

const tileClasses = computed(() => [classes.tile, selected ? classes.selected : classes.idle])
const boxClasses = computed(() => [classes.box, selected ? classes.checked : classes.unchecked])
</script>

<template>
  <div class="group relative">
    <button
      type="button"
      :aria-pressed="selected"
      :class="tileClasses"
      @click="emit('toggle')"
    >
      <PhotosRendition :photo="photo.id" />
      <span class="sr-only">{{ name }}</span>
      <span
        v-if="photo.hidden"
        class="absolute inset-0 flex items-center justify-center gap-1.5 bg-argent-50/80 text-label font-semibold text-sable-600"
      >
        <EyeOff
          :size="16"
          aria-hidden="true"
        />
        Masquée du site
      </span>
      <span
        aria-hidden="true"
        :class="boxClasses"
      >
        <Check
          v-if="selected"
          :size="16"
          :stroke-width="2.4"
        />
      </span>
      <UiStatusPill
        v-if="cover"
        tone="dark"
        class="absolute bottom-2.5 left-2.5"
      >
        <Star
          :size="13"
          aria-hidden="true"
        />
        Couverture
      </UiStatusPill>
      <UiStatusPill
        v-if="photo.image_rights_to_review"
        tone="ambre"
        class="absolute right-2.5 bottom-2.5"
      >
        À vérifier
      </UiStatusPill>
    </button>
    <UiIconButton
      v-if="enlargeable"
      :label="enlargeLabel"
      size="sm"
      :class="classes.enlarge"
      @click="emit('enlarge')"
    >
      <Maximize2 :size="16" />
    </UiIconButton>
  </div>
</template>
