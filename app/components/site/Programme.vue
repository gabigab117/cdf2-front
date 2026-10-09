<script setup lang="ts">
import type { components } from '~/types/api'

const { items } = defineProps<{ items: Array<components['schemas']['PublicProgrammeItemOut']> }>()

const { clock } = useDateFormat()
</script>

<!-- « Au programme »: the lines of the programme on a time line, the last one in black. -->
<template>
  <section
    aria-labelledby="programme"
    class="flex flex-col gap-7"
  >
    <SiteBlockTitle id="programme">
      Au programme
    </SiteBlockTitle>
    <ol class="ml-2 flex flex-col border-l-2 border-argent-200">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="group relative flex gap-5 pb-7 pl-7 last:pb-0"
      >
        <span
          class="absolute top-1.5 -left-1.75 size-3 rounded-full bg-azur-600 ring-4 ring-argent-50 group-last:bg-sable-950"
          aria-hidden="true"
        />
        <span class="w-14 shrink-0 pt-0.5 font-mono text-body font-semibold text-azur-600 md:w-20">{{ clock(item.time) }}</span>
        <span class="flex min-w-0 flex-col gap-1">
          <span class="text-lg font-semibold">{{ item.title }}</span>
          <span
            v-if="item.description"
            class="text-sable-600"
          >{{ item.description }}</span>
        </span>
      </li>
    </ol>
  </section>
</template>
