<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

// How the former committee staffed its stations, from the v1: folded, a
// reminder at hand rather than a rule.
</script>

<template>
  <details class="group rounded-tile border border-argent-200 bg-white">
    <summary class="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-ui font-semibold text-sable-950">
      Rappel — organisation de l’ancien comité
      <ChevronDown
        :size="18"
        aria-hidden="true"
        class="text-argent-600 transition-transform group-open:rotate-180"
      />
    </summary>
    <div class="flex flex-col gap-3 border-t border-argent-100 px-5 py-4">
      <table class="w-full max-w-md text-left text-ui">
        <thead>
          <tr class="text-caption font-semibold tracking-overline text-argent-600 uppercase">
            <th
              scope="col"
              class="pb-2 font-semibold"
            >
              Poste
            </th>
            <th
              scope="col"
              class="pb-2 font-semibold"
            >
              Personnes
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-argent-100">
          <tr
            v-for="row in FORMER_STAFFING"
            :key="row.station"
          >
            <th
              scope="row"
              class="py-2 pr-6 font-medium text-sable-950"
            >
              {{ row.station }}
            </th>
            <td class="py-2 font-mono text-sable-600">
              {{ row.people }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="text-sm text-sable-600">
        Total estimé : environ 17 à 20 bénévoles.
      </p>
    </div>
  </details>
</template>
