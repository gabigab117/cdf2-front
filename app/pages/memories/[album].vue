<script setup lang="ts">
definePageMeta({ path: '/souvenirs/:album', public: true })

// The address of an album is its number, then its title (D17): the number finds
// it, and an address whose title has changed since leads to the current one.
const address = String(useRoute().params.album)
const id = albumIdOf(address)
if (id === null) {
  throw createError({ status: 404, statusText: 'Not Found', fatal: true })
}

const { data: album, error } = await usePublicAlbum(id)

// An album the site does not show is not found. The API out of reach is a page
// to try again later.
if (!album.value) {
  throw createError(
    error.value?.status === 404
      ? { status: 404, statusText: 'Not Found', fatal: true }
      : { status: 503, statusText: 'Service Unavailable', fatal: true, data: { path: publicAlbumPath(address) } },
  )
}
if (album.value.slug !== address) {
  await navigateTo(publicAlbumPath(album.value.slug), { redirectCode: 301, replace: true })
}

const { calendarLong } = useDateFormat()

const breadcrumb = computed(() => [{ label: 'Souvenirs', to: MEMORIES_PATH }, { label: album.value?.title ?? '' }])
const facts = computed(() => (album.value ? `${calendarLong(album.value.date)} · ${photosText(album.value.photos_count)}` : ''))

useSitePage({
  title: () => album.value?.title ?? '',
  description: () => (album.value ? `${facts.value} : les photos de l’album « ${album.value.title} », par le ${SITE_NAME}.` : ''),
})
</script>

<template>
  <div
    v-if="album"
    class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-20 md:gap-10 md:px-6 md:pt-10 md:pb-24"
  >
    <UiBreadcrumb
      :items="breadcrumb"
      back
    />
    <header class="flex flex-col gap-4">
      <SitePageTitle>
        {{ album.title }}
      </SitePageTitle>
      <p class="text-intro text-sable-600">
        {{ facts }}
      </p>
    </header>
    <SitePhotoGrid :album />
  </div>
</template>
