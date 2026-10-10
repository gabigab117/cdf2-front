<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// The text comes as a prop, not in a slot: the linter lays a slot out on its
// own lines, and the link would then end with a space, before the comma or the
// full stop that follows it.
const { to, label } = defineProps<{
  /** A page of the site, or an address of its own (`mailto:`, `https://…`). */
  to: RouteLocationRaw
  label: string
}>()
</script>

<!-- A link within a text of the public site, in azur. -->
<template>
  <NuxtLink
    :to
    class="text-azur-600 transition-colors hover:text-azur-700"
  >{{ label }}</NuxtLink>
</template>
