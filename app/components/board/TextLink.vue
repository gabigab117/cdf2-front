<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// The text comes as a prop, as SiteTextLink's does: in a slot, the linter would
// lay it out on its own lines, and the link would end with a space.
const { to, label } = defineProps<{
  to: RouteLocationRaw
  label: string
}>()
</script>

<!-- A link within a sentence of the board space, in azur. -->
<template>
  <NuxtLink
    :to
    class="font-medium text-azur-600 hover:text-azur-700"
  >{{ label }}</NuxtLink>
</template>
