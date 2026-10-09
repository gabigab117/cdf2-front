import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/**/*.spec.ts'],
    environmentOptions: {
      nuxt: {
        // Fictitious values for the configuration the environment provides.
        overrides: {
          runtimeConfig: {
            public: {
              siteUrl: 'https://site.example',
              contact: { email: 'contact@example.test', phone: '01 23 45 67 89' },
              hall: { street: '1 place de la Mairie', town: '00000 Commune' },
            },
          },
        },
      },
    },
  },
})
