<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'

const { to, label } = defineProps<{
  to: RouteLocationRaw
  label: string
}>()
</script>

<!-- A link of the public site that leads further, its arrow after it: « Tous les albums ». -->
<template>
  <NuxtLink
    :to
    class="inline-flex items-center gap-2 text-body font-semibold text-azur-600 transition-colors hover:text-azur-700"
  >
    {{ label }}
    <ArrowRight :size="18" />
  </NuxtLink>
</template>
