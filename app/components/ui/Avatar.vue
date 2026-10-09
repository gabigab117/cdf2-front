<script setup lang="ts">
const { name, size = 'md', tone = 'azur' } = defineProps<{
  /** A full name, or an e-mail address for want of one. */
  name: string
  /** 32 or 36 px. */
  size?: 'sm' | 'md'
  /** Azur for the signed-in member, softer tones for the others. */
  tone?: 'azur' | 'soft' | 'neutral'
}>()

const classes = {
  base: 'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
  size: {
    sm: 'size-8 text-xs',
    md: 'size-9 text-label',
  },
  tone: {
    azur: 'bg-azur-600 text-white',
    soft: 'bg-azur-100 text-azur-700',
    neutral: 'bg-argent-100 text-sable-800',
  },
}

// "Camille Martin" → "CM"; an address gives the initials of its local part:
// "camille.martin@…" → "CM".
const initials = computed(() => {
  const [local = ''] = name.split('@')
  const words = local.split(/[\s._]+/).filter(Boolean)
  const first = words[0]?.charAt(0) ?? ''
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : ''
  return `${first}${last}`.toUpperCase()
})

// The name always shows next to the avatar, which screen readers skip (aria-hidden):
// the initials would only repeat it.
const avatarClasses = computed(() => [classes.base, classes.size[size], classes.tone[tone]])
</script>

<template>
  <span
    aria-hidden="true"
    :class="avatarClasses"
  >{{ initials }}</span>
</template>
