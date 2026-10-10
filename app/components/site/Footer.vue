<script setup lang="ts">
const now = useNow()
const year = computed(() => parisCalendar(now.value).year)

const route = useRoute()

// The legal pages from every page; the committee's contact details from any
// page but the home page, which shows them just above.
const links = computed(() => [
  ...(route.path === '/' ? [] : [{ label: 'Contact', to: '/#contact' }]),
  { label: 'Mentions légales', to: LEGAL_NOTICE_PATH },
  { label: 'Données personnelles', to: PRIVACY_PATH },
])
</script>

<template>
  <footer class="border-t border-argent-200 bg-argent-50">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-7 text-note text-argent-600 md:px-6">
      <p>© {{ year }} Comité des Fêtes d’Ons-en-Bray</p>
      <nav aria-label="Pied de page">
        <ul class="flex flex-wrap gap-x-5 gap-y-2">
          <li
            v-for="link in links"
            :key="link.to"
          >
            <NuxtLink
              :to="link.to"
              class="transition-colors hover:text-sable-950"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
</template>
