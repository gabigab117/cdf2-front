import { LUCIDE_CONTEXT } from '@lucide/vue'

// The mockup draws its icons with a 1.8 stroke. Provided to the whole
// application, the error page included, which app.vue does not wrap.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.provide(LUCIDE_CONTEXT, { strokeWidth: 1.8 })
})
