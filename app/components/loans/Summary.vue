<script setup lang="ts">
import { Check, CircleAlert } from '@lucide/vue'

/** A line of the loan, as the summary lists it. */
interface SummaryLine {
  id: number
  name: string
  quantity: number
  /** « 1 libre », « indisponible »: shown when the line asks for more. */
  beyond: string | null
}

// The summary beside the loan form: whom it lends to and when, its lines, what
// they are worth, the deposit, and whether all of it is free.
const { title, subtitle, lines, value, deposit, conflict, available, blocked, pending, action } = defineProps<{
  title: string
  subtitle: string
  lines: readonly SummaryLine[]
  /** « 2 550,00 € », what the equipment would cost to replace. */
  value: string
  /** « Chèque de 150,00 € (non encaissé) », « Aucune ». */
  deposit: string
  /** What goes beyond what is free, or null. */
  conflict: string | null
  /** Every line is free over the loan's days. */
  available: boolean
  /** The loan cannot be sent as it stands. */
  blocked: boolean
  pending: boolean
  /** The button that sends: « Enregistrer le prêt », « Enregistrer ». */
  action: string
}>()

const emit = defineEmits<{
  /** Bring each line beyond back to what is free. */
  reduce: []
}>()
</script>

<template>
  <aside
    aria-label="Récapitulatif"
    class="flex flex-col overflow-hidden rounded-panel border border-argent-200 bg-white shadow-float"
  >
    <div class="flex flex-col gap-1 border-b border-argent-100 px-5.5 py-5">
      <span class="text-caption font-semibold tracking-eyebrow text-argent-600 uppercase">Récapitulatif</span>
      <span class="font-display text-2xl leading-tight font-bold">{{ title }}</span>
      <span class="text-sm text-sable-600">{{ subtitle }}</span>
    </div>
    <ul
      v-if="lines.length > 0"
      class="flex flex-col py-2"
    >
      <li
        v-for="line in lines"
        :key="line.id"
        class="flex items-center gap-2.5 px-5.5 py-2 text-ui"
      >
        <span class="min-w-0 flex-1">{{ line.name }}</span>
        <UiStatusPill
          v-if="line.beyond"
          tone="ambre"
          size="sm"
        >
          {{ line.beyond }}
        </UiStatusPill>
        <span class="font-mono font-semibold">× {{ line.quantity }}</span>
      </li>
    </ul>
    <p
      v-else
      class="px-5.5 py-3 text-sm text-argent-600"
    >
      Aucun matériel ajouté.
    </p>
    <dl class="flex flex-col gap-0.5 border-t border-argent-100 px-5.5 py-3 text-sm">
      <div class="flex justify-between gap-3 py-1.5">
        <dt class="text-argent-600">
          Valeur du matériel
        </dt>
        <dd class="font-mono font-medium">
          {{ value }}
        </dd>
      </div>
      <div class="flex justify-between gap-3 py-1.5">
        <dt class="text-argent-600">
          Caution
        </dt>
        <dd class="text-right font-medium">
          {{ deposit }}
        </dd>
      </div>
    </dl>
    <UiCallout
      v-if="conflict"
      class="mx-4 mb-1"
      tone="ambre"
      role="alert"
      :icon="CircleAlert"
    >
      {{ conflict }}
      <template #actions>
        <UiButton
          variant="secondary"
          size="sm"
          @click="emit('reduce')"
        >
          Ramener aux quantités libres
        </UiButton>
      </template>
    </UiCallout>
    <UiCallout
      v-else-if="available"
      class="mx-4 mb-1"
      :icon="Check"
    >
      Tout est disponible sur la période.
    </UiCallout>
    <div class="flex flex-col gap-2 px-4 pt-3.5 pb-4">
      <UiButton
        type="submit"
        variant="accent"
        size="xl"
        block
        :disabled="blocked"
        :loading="pending"
      >
        {{ action }}
      </UiButton>
      <slot />
      <p class="px-1 pt-1 text-caption text-pretty text-argent-600">
        Une fois enregistré, ce matériel est bloqué sur ces dates pour les autres prêts et les événements du comité.
      </p>
    </div>
  </aside>
</template>
