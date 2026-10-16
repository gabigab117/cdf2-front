<script setup lang="ts">
// « Avances à rembourser » (6.5): what the committee owes its members, the
// oldest advance first, each marked reimbursed in place. It reads the bell's
// aggregate (A6), which holds the first ten: the journal lists them all.
const emit = defineEmits<{ changed: [] }>()

const { data: overview } = useBoardOverview()
const { amount } = useMoneyFormat()
const { calendarDay } = useDateFormat()
const now = useNow()
const titleId = useId()

const ALL_ADVANCES = pendingLinesLocation('advances')

// The advance whose form shows.
const opened = ref<number | null>(null)

const advances = computed(() => overview.value?.pending.advances ?? null)
const total = computed(() => (advances.value && advances.value.count > 0 ? amount(advances.value.total) : null))
const items = computed(() =>
  (advances.value?.items ?? []).map(entry => ({
    entry,
    to: entryPath(entry.id),
    line: `${memberSignature(entry.advanced_by)} · ${calendarDay(entry.date, now.value)}`,
    amount: amount(entry.amount),
  })),
)
const allText = computed(() => {
  const count = advances.value?.count ?? 0
  if (count === 0) return null
  return count === 1 ? 'Voir l’avance à rembourser' : `Voir les ${count} avances à rembourser`
})

// Its line paid back, the advance leaves the card with the bell's next reading.
function reimbursed(): void {
  opened.value = null
  emit('changed')
}
</script>

<template>
  <UiCard
    flush
    :aria-labelledby="titleId"
  >
    <div class="flex flex-col gap-1 border-b border-argent-100 px-5 py-4.5">
      <h2
        :id="titleId"
        class="text-base font-semibold"
      >
        Avances à rembourser
      </h2>
      <p
        v-if="total"
        class="text-note text-argent-600"
      >
        Total dû : <span class="font-mono font-semibold text-sable-950">{{ total }}</span>
      </p>
    </div>
    <ul
      v-if="items.length > 0"
      class="flex flex-col divide-y divide-argent-100"
    >
      <li
        v-for="item in items"
        :key="item.entry.id"
        class="flex flex-col gap-2.5 px-5 py-3.5"
      >
        <div class="flex items-start justify-between gap-3">
          <NuxtLink
            :to="item.to"
            class="flex min-w-0 flex-col gap-0.5 hover:text-azur-700"
          >
            <span class="truncate text-ui font-medium">{{ item.entry.label }}</span>
            <span class="text-label text-argent-600">{{ item.line }}</span>
          </NuxtLink>
          <span class="font-mono text-note font-semibold">{{ item.amount }}</span>
        </div>
        <TreasuryReimbursementForm
          v-if="opened === item.entry.id"
          :entry="item.entry"
          @saved="reimbursed"
          @cancel="opened = null"
        />
        <UiButton
          v-else
          variant="link"
          class="self-start"
          @click="opened = item.entry.id"
        >
          Marquer remboursée
        </UiButton>
      </li>
    </ul>
    <UiEmptyState v-else-if="advances">
      Aucune avance à rembourser.
    </UiEmptyState>
    <NuxtLink
      v-if="allText"
      :to="ALL_ADVANCES"
      class="block border-t border-argent-100 px-5 py-3.5 text-sm font-medium text-azur-600 hover:text-azur-700"
    >
      {{ allText }}
    </NuxtLink>
  </UiCard>
</template>
