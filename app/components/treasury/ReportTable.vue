<script setup lang="ts">
// A table of the report for the general meeting: its columns, the amounts to
// the right, then the line of its total, if it has one.
const { columns, rows, total = null } = defineProps<{
  columns: ReadonlyArray<{ label: string, amount?: boolean }>
  rows: ReadonlyArray<{ key: string | number, cells: readonly string[] }>
  total?: readonly string[] | null
}>()

const classes = {
  cell: 'border border-argent-400 px-2 py-0.5',
  amount: 'text-right font-mono whitespace-nowrap',
}

function cellClasses(index: number): string[] {
  return [classes.cell, columns[index]?.amount ? classes.amount : 'text-left']
}
</script>

<template>
  <table class="w-full border-collapse text-caption">
    <thead>
      <tr class="text-overline uppercase">
        <th
          v-for="(column, index) in columns"
          :key="column.label"
          :class="cellClasses(index)"
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
          :class="cellClasses(index)"
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
          :class="cellClasses(index)"
        >
          {{ cell }}
        </td>
      </tr>
    </tfoot>
  </table>
</template>
