<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'

const { contact } = useRuntimeConfig().public
</script>

<!-- « Un coup de main, une idée d'animation ? », without the list of the board
that the mockup draws beside it (D2): no name on the public site. -->
<template>
  <section
    id="comite"
    class="relative scroll-mt-20 overflow-hidden bg-sable-900 text-white"
  >
    <div
      class="absolute -right-45 -bottom-60 hidden h-150 w-205 bg-azur-600 chevron md:block"
      aria-hidden="true"
    />
    <div class="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:px-6 md:py-26">
      <h2 class="max-w-2xl font-display text-section font-heavy text-balance">
        Un coup de main, une idée d’animation ?
      </h2>
      <p class="max-w-130 text-lg leading-relaxed text-argent-350">
        Le comité fonctionne grâce aux bénévoles. Deux heures un samedi suffisent : installation, buvette, rangement. Écrivez-nous, on vous recontacte.
      </p>
      <UiButton
        v-if="contact.email"
        variant="inverse"
        size="xl"
        :to="`mailto:${contact.email}`"
        class="w-fit"
      >
        Nous écrire
        <ArrowRight
          :size="18"
          aria-hidden="true"
        />
      </UiButton>
    </div>
  </section>
</template>
