<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-argent-200 bg-argent-50 md:border-t-0">
    <div class="mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-6 pb-7 md:px-6 md:pt-18 md:pb-10">
      <div class="hidden flex-col gap-4 md:flex">
        <div class="flex items-center gap-3">
          <UiCoatOfArms class="h-8.5 w-7.5" />
          <span class="font-display text-title font-bold">Comité des Fêtes d’Ons-en-Bray</span>
        </div>
        <p class="max-w-70 text-ui text-argent-600">
          Association loi 1901 qui organise les animations de la commune.
        </p>
      </div>
      <p class="text-note text-argent-600 md:border-t md:border-argent-200 md:pt-6">
        © {{ year }} Comité des Fêtes d’Ons-en-Bray
      </p>
    </div>
  </footer>
</template>
