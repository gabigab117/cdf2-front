<script setup lang="ts">
// A sheet drawn in a document's place: beside the panel's buttons, and in the
// viewer while the file arrives.
</script>

<template>
  <div
    class="flex h-28 w-21.5 shrink-0 flex-col gap-1.5 rounded-lg bg-white px-2.5 py-3 shadow-float ring-1 ring-argent-200"
    aria-hidden="true"
  >
    <span class="h-1.5 w-3/5 rounded-full bg-sable-950" />
    <span class="h-1 w-11/12 rounded-full bg-argent-200" />
    <span class="h-1 w-4/5 rounded-full bg-argent-200" />
    <span class="h-1 w-5/6 rounded-full bg-argent-200" />
    <span class="mt-auto h-1.5 w-2/5 self-end rounded-full bg-azur-600" />
  </div>
</template>
