<script setup lang="ts">
// A table of the report for the general meeting: its columns, the amounts to
// the right, then the line of its total, if it has one; or what it says when
// it has no row.
const { columns, rows, total = null, empty } = defineProps<{
  columns: ReadonlyArray<{ label: string, amount?: boolean }>
  rows: ReadonlyArray<{ key: string | number, cells: readonly string[] }>
  total?: readonly string[] | null
  empty?: string
}>()

const classes = {
  cell: 'border border-argent-400 px-2 py-0.5',
  text: 'text-left',
  amount: 'text-right whitespace-nowrap',
  figure: 'font-mono',
}

// The headers in the sheet's font, the amounts in figures.
const headerClasses = computed(() => columns.map(column => [classes.cell, column.amount ? classes.amount : classes.text]))
const cellClasses = computed(() => columns.map((column, index) => [...headerClasses.value[index]!, ...(column.amount ? [classes.figure] : [])]))
</script>

<template>
  <p
    v-if="rows.length === 0"
    class="text-caption"
  >
    {{ empty }}
  </p>
  <table
    v-else
    class="w-full border-collapse text-caption"
  >
    <thead>
      <tr class="text-overline uppercase">
        <th
          v-for="(column, index) in columns"
          :key="column.label"
          :class="headerClasses[index]"
        >
          {{ column.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.key"
      >
        <td
          v-for="(cell, index) in row.cells"
          :key="index"
          :class="cellClasses[index]"
        >
          {{ cell }}
        </td>
      </tr>
    </tbody>
    <tfoot v-if="total">
      <tr class="font-bold">
        <td
          v-for="(cell, index) in total"
          :key="index"
          :class="cellClasses[index]"
        >
          {{ cell }}
        </td>
      </tr>
    </tfoot>
  </table>
</template>
