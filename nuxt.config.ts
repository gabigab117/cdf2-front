import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@pinia/nuxt'],

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-side rendering calls the API on the server's own network, as a
    // relative URL only resolves in a browser. Set by NUXT_API_INTERNAL_URL, with
    // no default: a build must never aim at a port it does not know.
    apiInternalUrl: '',
  },

  // Public pages are rendered on the server (indexable, readable without
  // JavaScript); the board's private area is a client-side application whose
  // session only ever exists in the browser.
  routeRules: {
    '/bureau/**': { ssr: false },
  },

  compatibilityDate: '2026-10-07',

  nitro: {
    // In development the API is reached through the front end's origin, as
    // nginx does in production: no CORS, and the refresh cookie stays first-party.
    devProxy: {
      '/api': { target: 'http://localhost:8000/api', changeOrigin: true },
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  fonts: {
    families: [
      { name: 'Bricolage Grotesque', provider: 'google', weights: ['400 800'] },
      { name: 'Geist', provider: 'google', weights: [400, 500, 600] },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500, 600] },
    ],
  },
})
