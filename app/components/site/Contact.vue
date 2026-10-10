<script setup lang="ts">
// The association's own details, from the configuration: never a member's.
const { contact, hall } = useRuntimeConfig().public
</script>

<template>
  <section
    id="contact"
    class="scroll-mt-20 bg-argent-50"
  >
    <div class="mx-auto grid max-w-7xl gap-10 px-4 pt-14 pb-12 md:grid-cols-3 md:px-6 md:pt-18">
      <div class="flex flex-col gap-4">
        <p class="flex items-center gap-3">
          <UiCoatOfArms class="h-8.5 w-7.5" />
          <span class="font-display text-title font-bold">Comité des Fêtes d’Ons-en-Bray</span>
        </p>
        <p class="max-w-70 text-ui text-argent-600">
          Association loi 1901 qui organise les animations de la commune.
        </p>
      </div>
      <div
        v-if="contact.email || contact.phone"
        class="flex flex-col gap-2.5 text-body"
      >
        <h2 class="text-caption font-semibold tracking-overline text-argent-600 uppercase">
          Contact
        </h2>
        <SiteTextLink
          v-if="contact.email"
          :to="`mailto:${contact.email}`"
          :label="contact.email"
          class="w-fit"
        />
        <p
          v-if="contact.phone"
          class="text-sable-600"
        >
          {{ contact.phone }}
        </p>
      </div>
      <div
        v-if="hall.street || hall.town"
        class="flex flex-col gap-2.5 text-body"
      >
        <h2 class="text-caption font-semibold tracking-overline text-argent-600 uppercase">
          Salle des fêtes
        </h2>
        <p class="text-sable-600">
          {{ hall.street }}<br>{{ hall.town }}
        </p>
      </div>
    </div>
  </section>
</template>
