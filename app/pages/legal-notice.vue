<script setup lang="ts">
// The path is also written in the routeRules of nuxt.config.ts, which serve the
// page without scripts: apart, the page would reload without end.
definePageMeta({ path: '/mentions-legales', public: true })

// Private keys, which only the server's rendering reads: the page is served
// without scripts, and the browser never renders it.
const { legal, public: { contact, office } } = useRuntimeConfig()

const hostDetails = [
  { label: 'Hébergeur', value: legal.host.name },
  { label: 'Adresse', value: legal.host.address },
  { label: 'Téléphone', value: legal.host.phone },
  { label: 'Localisation du serveur', value: legal.host.location },
].filter(detail => detail.value)

useSitePage({
  title: 'Mentions légales',
  description: `L’éditeur du site du ${SITE_NAME}, la direction de sa publication et son hébergeur.`,
})
// The page names the publication director, as the law requires: search
// engines leave it out of their results.
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <SiteLegalPage title="Mentions légales">
    <SiteLegalSection title="Éditeur">
      <p>Ce site est édité par le {{ SITE_NAME }}, association régie par la loi du 1er juillet 1901.</p>
      <dl class="flex flex-col gap-4">
        <SiteLegalDetail
          v-if="office.street || office.town"
          label="Siège"
        >
          <span
            v-if="office.street"
            class="block"
          >{{ office.street }}</span>
          <span
            v-if="office.town"
            class="block"
          >{{ office.town }}</span>
        </SiteLegalDetail>
        <SiteLegalDetail
          v-if="contact.email"
          label="E-mail"
        >
          <SiteTextLink
            :to="`mailto:${contact.email}`"
            :label="contact.email"
          />
        </SiteLegalDetail>
        <SiteLegalDetail
          v-if="contact.phone"
          label="Téléphone"
        >
          {{ contact.phone }}
        </SiteLegalDetail>
      </dl>
    </SiteLegalSection>
    <SiteLegalSection
      v-if="legal.publicationDirector"
      title="Direction de la publication"
    >
      <p class="text-sable-950">
        {{ legal.publicationDirector }}
      </p>
    </SiteLegalSection>
    <SiteLegalSection
      v-if="hostDetails.length"
      title="Hébergement"
    >
      <dl class="flex flex-col gap-4">
        <SiteLegalDetail
          v-for="detail in hostDetails"
          :key="detail.label"
          :label="detail.label"
        >
          {{ detail.value }}
        </SiteLegalDetail>
      </dl>
    </SiteLegalSection>
    <SiteLegalSection title="Propriété intellectuelle">
      <p>Les textes, le blason et les visuels de ce site appartiennent au {{ SITE_NAME }}, sauf mention contraire. Leur reproduction demande son accord.</p>
    </SiteLegalSection>
    <SiteLegalSection title="Données personnelles">
      <p>
        Ce que le site fait des données personnelles, et combien de temps il les garde, est décrit sur la page
        <SiteTextLink
          :to="PRIVACY_PATH"
          label="Données personnelles"
        />.
      </p>
    </SiteLegalSection>
  </SiteLegalPage>
</template>
