<script setup lang="ts">
// What went wrong, on a line of amber text: an action of a list, a field of
// its own. Screen readers announce it as soon as it shows; UiAlert frames it.
</script>

<template>
  <p
    role="alert"
    class="text-sm font-semibold text-ambre-800"
  >
    <slot />
  </p>
</template>
