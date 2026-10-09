<script setup lang="ts">
const { label, optional = false, help, errors = [] } = defineProps<{
  label: string
  /** A field that may stay empty says so. */
  optional?: boolean
  help?: string
  /** What the API found wrong with the value (toFormErrors). */
  errors?: readonly string[]
}>()

// The control comes through the slot, which receives the ids that tie it to its
// label, help and errors.
const id = useId()
const helpId = `${id}-help`
const errorId = `${id}-error`

const invalid = computed(() => errors.length > 0)
const describedby = computed(() =>
  [help && helpId, invalid.value && errorId].filter(Boolean).join(' ') || undefined,
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      :for="id"
      class="text-label font-semibold text-sable-600"
    >
      {{ label }}<span
        v-if="optional"
        class="font-normal text-argent-600"
      > (facultatif)</span>
    </label>
    <slot
      :id
      :describedby
      :invalid
    />
    <p
      v-if="help"
      :id="helpId"
      class="text-label text-argent-600"
    >
      {{ help }}
    </p>
    <p
      v-if="invalid"
      :id="errorId"
      class="flex items-start gap-2 text-sm text-ambre-800"
    >
      <span
        class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ambre-50 text-xs font-bold text-ambre-700"
        aria-hidden="true"
      >!</span>
      <span>{{ errors.join(' ') }}</span>
    </p>
  </div>
</template>
