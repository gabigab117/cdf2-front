<script setup lang="ts">
// The path is also written in the routeRules of nuxt.config.ts, which serve the
// page without scripts: apart, the page would reload without end.
definePageMeta({ path: '/mentions-legales', public: true })

// Private keys, which only the server's rendering reads: the page is served
// without scripts, and the browser never renders it.
const { legal, public: { contact, office } } = useRuntimeConfig()

const hasHost = Boolean(legal.host.name || legal.host.address || legal.host.phone || legal.host.location)

useSitePage({
  title: 'Mentions légales',
  description: 'L’éditeur du site du Comité des Fêtes d’Ons-en-Bray, la direction de sa publication et son hébergeur.',
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
      v-if="hasHost"
      title="Hébergement"
    >
      <dl class="flex flex-col gap-4">
        <SiteLegalDetail
          v-if="legal.host.name"
          label="Hébergeur"
        >
          {{ legal.host.name }}
        </SiteLegalDetail>
        <SiteLegalDetail
          v-if="legal.host.address"
          label="Adresse"
        >
          {{ legal.host.address }}
        </SiteLegalDetail>
        <SiteLegalDetail
          v-if="legal.host.phone"
          label="Téléphone"
        >
          {{ legal.host.phone }}
        </SiteLegalDetail>
        <SiteLegalDetail
          v-if="legal.host.location"
          label="Localisation du serveur"
        >
          {{ legal.host.location }}
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
