<script setup lang="ts">
import type { components } from '~/types/api'

type StockOperationOut = components['schemas']['StockOperationOut']

// « Mouvements récents »: the latest operations, a click on − or + among them,
// each leading to its page; then to them all.
const { operations } = defineProps<{ operations: readonly StockOperationOut[] }>()

const titleId = useId()
</script>

<template>
  <UiCard
    flush
    :aria-labelledby="titleId"
  >
    <h2
      :id="titleId"
      class="border-b border-argent-100 px-5 py-4.5 text-base font-semibold"
    >
      Mouvements récents
    </h2>
    <ul
      v-if="operations.length > 0"
      class="flex flex-col py-1.5"
    >
      <StockOperationRow
        v-for="operation in operations"
        :key="operation.id"
        :operation
      />
    </ul>
    <UiEmptyState v-else>
      Aucun mouvement pour l’instant.
    </UiEmptyState>
    <div class="border-t border-argent-100 px-5 py-3.5 text-note">
      <BoardTextLink
        :to="OPERATIONS_PATH"
        label="Voir toutes les opérations"
      />
    </div>
  </UiCard>
</template>
