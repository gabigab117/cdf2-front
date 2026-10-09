<script setup lang="ts">
import type { components } from '~/types/api'

const { infos } = defineProps<{ infos: Array<components['schemas']['PublicPracticalInfoOut']> }>()
</script>

<!-- « Bon à savoir »: a card for each piece of practical information. -->
<template>
  <section
    aria-labelledby="practical-infos"
    class="flex flex-col gap-6"
  >
    <SiteBlockTitle id="practical-infos">
      Bon à savoir
    </SiteBlockTitle>
    <ul class="grid gap-3.5 md:grid-cols-3">
      <li
        v-for="(info, index) in infos"
        :key="index"
        class="flex flex-col gap-2.5 rounded-tile border border-argent-200 bg-white p-5.5"
      >
        <span class="inline-flex size-10 items-center justify-center rounded-field bg-azur-100 text-azur-600">
          <component
            :is="PRACTICAL_INFO_ICONS[info.icon].icon"
            :size="20"
            aria-hidden="true"
          />
        </span>
        <span class="text-title font-semibold">{{ info.title }}</span>
        <span
          v-if="info.text"
          class="text-body text-sable-600"
        >{{ info.text }}</span>
      </li>
    </ul>
  </section>
</template>
