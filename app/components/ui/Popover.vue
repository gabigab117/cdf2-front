<script setup lang="ts">
const { placement } = defineProps<{
  /**
   * Over the top of the public site, across its width (its menu), or under
   * the board's top bar, at its end: the « Nouveau » menu, or the wider
   * « À traiter » panel of the bell.
   */
  placement: 'site' | 'board' | 'board-wide'
}>()

// The browser's own popover: its button opens it and closes it, and so do a
// click outside of it and Escape, all without any JavaScript. The ids tie the
// buttons to the panel, the same on the server and in the browser.
const id = useId()
const panel = useTemplateRef<HTMLElement>('panel')

const classes = {
  base: 'm-0 border border-argent-200 bg-white p-2 text-sable-950 shadow-float',
  placement: {
    'site': 'inset-x-3 top-3 bottom-auto w-auto rounded-panel backdrop:bg-sable-950/40',
    'board': 'top-19 right-4 bottom-auto left-auto w-60 rounded-card md:right-8',
    'board-wide': 'top-19 right-4 bottom-auto left-auto w-90 rounded-card md:right-8',
  },
}

// Leaving the page closes the panel: the browser only does it for a page it
// loads anew. A test environment knows no popover at all.
const route = useRoute()
watch(() => route.fullPath, () => {
  if (typeof panel.value?.hidePopover === 'function' && panel.value.matches(':popover-open')) panel.value.hidePopover()
})
</script>

<template>
  <div class="contents">
    <slot
      name="invoker"
      :invoker="{ popovertarget: id }"
    />
    <div
      :id
      ref="panel"
      popover
      :class="[classes.base, classes.placement[placement]]"
    >
      <slot :closer="{ popovertarget: id, popovertargetaction: 'hide' }" />
    </div>
  </div>
</template>
