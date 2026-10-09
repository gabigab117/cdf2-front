<script setup lang="ts">
const now = useNow()
const year = computed(() => parisCalendar(now.value).year)

// The home page shows the committee's contact details just above.
const route = useRoute()
const home = computed(() => route.path === '/')
</script>

<template>
  <footer class="border-t border-argent-200 bg-argent-50">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-7 text-note text-argent-600 md:px-6">
      <p>© {{ year }} Comité des Fêtes d’Ons-en-Bray</p>
      <nav
        v-if="!home"
        aria-label="Pied de page"
      >
        <ul class="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <NuxtLink
              to="/#contact"
              class="transition-colors hover:text-sable-950"
            >
              Contact
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
</template>
