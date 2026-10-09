import { registerEndpoint } from '@nuxt/test-utils/runtime'
import type { paths } from '~/types/api'

type EndpointOptions = Parameters<typeof registerEndpoint>[1]

const unregisters: Array<() => void> = []

/**
 * Mocks an operation of the API for the client of useApi().
 *
 * openapi-fetch hands fetch() a Request, whose URL is absolute, and the test
 * environment matches its mocks against the URL as it receives it: the mock is
 * registered under the absolute URL of the path.
 */
export function mockApi(path: keyof paths, options: EndpointOptions): void {
  unregisters.push(registerEndpoint(new URL(path, window.location.origin).href, options))
}

/** Removes every mock registered by mockApi(). */
export function clearApiMocks(): void {
  for (const unregister of unregisters.splice(0)) unregister()
}

/** An answer of the API, in JSON, with its status and headers. */
export function apiResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
