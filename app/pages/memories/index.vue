<script setup lang="ts">
definePageMeta({ path: '/souvenirs', public: true })

const route = useRoute()
const page = computed(() => queryPage(route.query.page))
const { data: albums } = await usePublicAlbums(page)

// The API out of reach is a page to try again later.
if (!albums.value) {
  throw createError({ status: 503, statusText: 'Service Unavailable', fatal: true, data: { path: MEMORIES_PATH } })
}

const items = computed(() => albums.value?.items ?? [])
const pageCount = computed(() => Math.ceil((albums.value?.count ?? 0) / MEMORIES_PAGE_SIZE))
const empty = computed(() => (page.value > 1 ? 'Cette page des albums est vide.' : 'Les photos des prochaines fêtes arriveront ici.'))

const breadcrumb = [{ label: 'Accueil', to: '/' }, { label: 'Souvenirs' }]

function pageLink(number: number) {
  return { path: MEMORIES_PATH, query: { page: pageParam(number) } }
}

useSitePage({
  title: 'Souvenirs',
  description: `Les albums photos des fêtes du ${SITE_NAME}, de la plus récente à la plus ancienne.`,
})
</script>

<template>
  <div
    v-if="albums"
    class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-20 md:gap-10 md:px-6 md:pt-10 md:pb-24"
  >
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <header class="flex flex-col gap-4">
      <SitePageTitle>
        Souvenirs
      </SitePageTitle>
      <p class="max-w-160 text-intro text-pretty text-sable-600">
        Les photos des fêtes du comité, de la plus récente à la plus ancienne.
      </p>
    </header>
    <SiteAlbumGrid
      v-if="items.length"
      :albums="items"
    />
    <p
      v-else
      class="flex flex-wrap gap-x-2 text-body text-argent-600"
    >
      {{ empty }}
      <SiteTextLink
        v-if="page > 1"
        :to="MEMORIES_PATH"
        label="Revenir aux derniers albums"
      />
    </p>
    <UiPagination
      :page
      :page-count
      :to="pageLink"
    />
  </div>
</template>
