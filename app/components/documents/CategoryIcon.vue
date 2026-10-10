<script setup lang="ts">
import type { components } from '~/types/api'
import type { CategoryTone } from '~/utils/documents'

type DocumentCategory = components['schemas']['DocumentCategory']

// The icon of a document's category, in the box that leads its row.
const { category } = defineProps<{ category: DocumentCategory }>()

const classes: Readonly<Record<CategoryTone, string>> = {
  azur: 'bg-azur-100 text-azur-700',
  ambre: 'bg-ambre-50 text-ambre-800',
  slate: 'bg-argent-100 text-sable-800',
  mist: 'bg-argent-75 text-sable-600',
}

const look = computed(() => DOCUMENT_CATEGORIES[category])
</script>

<template>
  <span
    class="inline-flex size-10 shrink-0 items-center justify-center rounded-field"
    :class="classes[look.tone]"
    aria-hidden="true"
  >
    <component
      :is="look.icon"
      :size="18"
    />
  </span>
</template>
