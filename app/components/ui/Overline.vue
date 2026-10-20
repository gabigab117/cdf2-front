<script setup lang="ts">
const { as } = defineProps<{
  /** The element it is: a title (h2), a term (dt), a row of column heads (tr). */
  as: string
}>()
</script>

<!-- A small grey title in capitals, over what it names: « Contact », « Siège ». -->
<template>
  <component
    :is="as"
    class="text-caption font-semibold tracking-overline text-argent-600 uppercase"
  >
    <slot />
  </component>
</template>
