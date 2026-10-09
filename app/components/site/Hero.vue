<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { components } from '~/types/api'

const { spotlight } = defineProps<{
  /** The next event of the agenda, if it holds any. */
  spotlight?: components['schemas']['PublicEventItemOut'] | null
}>()

const { season } = useDateFormat()
const now = useNow()
const currentSeason = computed(() => `Saison ${season(now.value)}`)
</script>

<!-- The top of the home page. The photos of past editions come with the albums
(phase 8): until then, its text does not mention them. -->
<template>
  <section class="relative overflow-hidden">
    <div class="mx-auto grid max-w-7xl items-center gap-9 px-4 pt-8 pb-10 md:grid-cols-2 md:gap-12 md:px-6 md:pt-20 md:pb-28">
      <div class="relative z-1 flex flex-col gap-4.5 md:gap-7">
        <p class="flex w-fit items-center gap-2.5 md:rounded-full md:border md:border-argent-200 md:bg-white md:py-1.25 md:pr-3.5 md:pl-1.25 md:text-note md:text-sable-600">
          <UiStatusPill tone="azur">
            {{ currentSeason }}
          </UiStatusPill>
          <span class="hidden md:inline">Ons-en-Bray · Oise</span>
        </p>
        <h1 class="font-display text-hero font-heavy text-balance">
          Les fêtes du village, organisées par <span class="text-azur-600">ses bénévoles.</span>
        </h1>
        <p class="max-w-130 text-base text-pretty text-sable-600 md:text-intro">
          <span class="md:hidden">L’agenda et les infos pratiques des manifestations.</span>
          <span class="hidden md:inline">Agenda des manifestations et infos pratiques : tout ce que le Comité des Fêtes prépare à Ons-en-Bray, au même endroit.</span>
        </p>
        <p class="hidden flex-wrap gap-3 md:flex">
          <UiButton
            variant="accent"
            size="xl"
            to="/#agenda"
          >
            Voir l’agenda
            <ArrowRight
              :size="18"
              aria-hidden="true"
            />
          </UiButton>
          <UiButton
            variant="secondary"
            size="xl"
            to="/#comite"
          >
            Devenir bénévole
          </UiButton>
        </p>
      </div>
      <div
        v-if="spotlight"
        class="relative flex md:min-h-140 md:items-center md:justify-end"
      >
        <div
          class="absolute -inset-x-15 -top-4 h-85 bg-azur-500 chevron md:-top-1/16 md:-right-1/3 md:-bottom-1/4 md:-left-1/7 md:h-auto"
          aria-hidden="true"
        />
        <SiteSpotlightCard
          :event="spotlight"
          class="relative"
        />
      </div>
    </div>
  </section>
</template>
