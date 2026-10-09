import type { Client } from 'openapi-fetch'
import type { paths } from '~/types/api'

/** A client of the API, typed by the back end's OpenAPI schema. */
export type ApiClient = Client<paths>

/**
 * The single way to call the API.
 *
 * In the browser, the client carries the board member's session
 * (plugins/api.client.ts). On the server, which renders the public pages, it
 * carries no credential at all (plugins/api.server.ts).
 */
export function useApi(): ApiClient {
  return useNuxtApp().$api
}
