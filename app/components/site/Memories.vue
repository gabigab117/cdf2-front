<script setup lang="ts">
import type { components } from '~/types/api'

const { albums, failed = false } = defineProps<{
  /** The latest albums of the site. */
  albums?: components['schemas']['PagedPublicAlbumItemOut'] | null
  /** They could not be read. */
  failed?: boolean
}>()

const items = computed(() => albums?.items ?? [])
</script>

<!-- « Souvenirs » on the home page: the latest albums of the site, and the way to
all of them. -->
<template>
  <section
    id="souvenirs"
    aria-labelledby="memories-title"
    class="mx-auto flex w-full max-w-7xl scroll-mt-20 flex-col gap-4.5 px-4 py-9 md:gap-10 md:px-6 md:py-24"
  >
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div class="flex flex-col gap-2.5">
        <h2
          id="memories-title"
          class="font-display text-section font-heavy"
        >
          Souvenirs
        </h2>
        <p class="hidden text-title text-sable-600 md:block">
          Les photos des dernières éditions.
        </p>
      </div>
      <SiteArrowLink
        v-if="items.length"
        :to="MEMORIES_PATH"
        label="Tous les albums"
      />
    </div>
    <p
      v-if="failed"
      class="text-body text-argent-600"
    >
      Les albums ne peuvent pas s’afficher pour le moment. Réessayez dans quelques minutes.
    </p>
    <SiteAlbumGrid
      v-else-if="items.length"
      :albums="items"
    />
    <p
      v-else
      class="text-body text-argent-600"
    >
      Les photos des prochaines fêtes arriveront ici.
    </p>
  </section>
</template>
