<script setup lang="ts">
import { Calendar } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type EventCategory = components['schemas']['EventCategory']

const { overview, events, failed = false, query } = defineProps<{
  /** The categories the agenda holds and the day of its last change. */
  overview?: components['schemas']['AgendaOut'] | null
  /** The page of the agenda shown. */
  events?: components['schemas']['PagedPublicEventItemOut'] | null
  /** The agenda could not be read. */
  failed?: boolean
  /** The part of the agenda the address asks for. */
  query: AgendaQuery
}>()

const { siteUrl } = useRuntimeConfig().public
const { longDay } = useDateFormat()
const now = useNow()

// Every link of the agenda leads back to it on the home page, without JavaScript.
function agendaLink(category: EventCategory | null, page = 1): RouteLocationRaw {
  return { path: '/', query: agendaQuery({ category, page }), hash: '#agenda' }
}

const categories = computed(() => overview?.categories ?? [])
const items = computed(() => events?.items ?? [])
const pageCount = computed(() => Math.ceil((events?.count ?? 0) / AGENDA_PAGE_SIZE))

const empty = computed(() => {
  if (query.page > 1) return 'Cette page de l’agenda est vide.'
  return query.category ? 'Aucune manifestation à venir dans cette catégorie.' : 'Aucune manifestation à venir pour le moment.'
})

// A visitor's calendar subscribes to the agenda (webcal), rather than
// importing it once: it keeps it up to date.
const subscription = computed(() =>
  siteUrl ? new URL('/api/public/agenda.ics', siteUrl).href.replace(/^https?:/, 'webcal:') : '/api/public/agenda.ics',
)

// « le 30 septembre », with its year once that year is over.
const updatedOn = computed(() => {
  if (!overview?.updated_at) return null
  const year = parisCalendar(overview.updated_at).year !== parisCalendar(now.value).year
  return longDay(overview.updated_at, { weekday: 'none', year })
})
</script>

<template>
  <section
    id="agenda"
    aria-labelledby="agenda-title"
    class="scroll-mt-20 border-y border-argent-200 bg-white"
  >
    <div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-9 pb-7 md:gap-10 md:px-6 md:py-22">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="flex flex-col gap-2.5">
          <h2
            id="agenda-title"
            class="font-display text-section font-heavy"
          >
            Agenda
          </h2>
          <p class="hidden text-title text-sable-600 md:block">
            Les prochaines manifestations du comité.
          </p>
        </div>
        <nav
          v-if="categories.length"
          aria-label="Filtrer par type d’événement"
        >
          <ul class="flex flex-wrap gap-2">
            <li>
              <UiFilterChip
                :to="agendaLink(null)"
                :pressed="query.category === null"
              >
                Tout
              </UiFilterChip>
            </li>
            <li
              v-for="category in categories"
              :key="category"
            >
              <UiFilterChip
                :to="agendaLink(category)"
                :pressed="query.category === category"
              >
                {{ EVENT_CATEGORIES[category] }}
              </UiFilterChip>
            </li>
          </ul>
        </nav>
      </div>
      <p
        v-if="failed"
        class="border-t border-argent-200 pt-6 text-body text-argent-600"
      >
        L’agenda ne peut pas s’afficher pour le moment. Réessayez dans quelques minutes.
      </p>
      <template v-else>
        <ol
          v-if="items.length"
          class="flex flex-col border-t border-argent-200"
        >
          <SiteAgendaRow
            v-for="event in items"
            :key="event.slug"
            :event
          />
        </ol>
        <p
          v-else
          class="flex flex-wrap gap-x-2 border-t border-argent-200 pt-6 text-body text-argent-600"
        >
          {{ empty }}
          <NuxtLink
            v-if="query.page > 1"
            :to="agendaLink(query.category)"
            class="text-azur-600 transition-colors hover:text-azur-700"
          >
            Revenir au début de l’agenda
          </NuxtLink>
        </p>
        <UiPagination
          :page="query.page"
          :page-count
          :to="page => agendaLink(query.category, page)"
        />
      </template>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <a
          :href="subscription"
          class="inline-flex items-center gap-2 text-body font-semibold text-azur-600 transition-colors hover:text-azur-700"
        >
          <Calendar
            :size="18"
            aria-hidden="true"
          />
          Ajouter l’agenda à mon calendrier
        </a>
        <p
          v-if="updatedOn"
          class="hidden text-sm text-argent-600 md:block"
        >
          Mis à jour par le bureau le {{ updatedOn }}
        </p>
      </div>
    </div>
  </section>
</template>
