import createClient from 'openapi-fetch'
import type { ApiClient } from '~/composables/useApi'
import type { paths } from '~/types/api'

// A public page is rendered alike for every visitor: the server's client holds no
// credential, forwards no cookie, and reaches the API on the server's own network.
export default defineNuxtPlugin(() => {
  const api: ApiClient = createClient<paths>({ baseUrl: useRuntimeConfig().apiInternalUrl })

  return { provide: { api } }
})
