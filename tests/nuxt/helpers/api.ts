import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { vi } from 'vitest'
import type { paths } from '~/types/api'

type EndpointOptions = Parameters<typeof registerEndpoint>[1]

const unregisters: Array<() => void> = []

/**
 * Mocks an operation of the API for the client of useApi(), on the path of the
 * schema, its parameters given: `mockApi('/api/board/events/{event_id}', …,
 * { event_id: 12 })`.
 *
 * openapi-fetch hands fetch() a Request, whose URL is absolute, and the test
 * environment matches its mocks against the URL as it receives it, its query
 * string left out: the mock is registered under the absolute URL of the path.
 */
export function mockApi(
  path: keyof paths,
  options: EndpointOptions,
  parameters: Record<string, string | number> = {},
): void {
  const concrete = path.replace(/\{(\w+)\}/g, (_match, name: string) => String(parameters[name]))
  unregisters.push(registerEndpoint(new URL(concrete, window.location.origin).href, options))
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

/** A file sent in a form, as a test reads it. */
export interface SentFile {
  name: string
  type: string
}

/** A request sent to the API, as a test reads it. */
export interface SentRequest {
  method: string
  /** Its path and query string: "/api/board/events?period=upcoming". */
  url: string
  /** Its JSON body, if any, or the fields of its multipart form. */
  body?: unknown
}

/**
 * Records the requests sent to the API from now on, until the mocks are
 * restored (vi.restoreAllMocks()). Each request goes on with its body unread.
 */
export function recordRequests(): SentRequest[] {
  const sent: SentRequest[] = []
  const fetch = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (!(input instanceof Request)) return fetch(input, init)
    const { pathname, search } = new URL(input.url)
    const body = await sentBody(input.clone())
    sent.push({ method: input.method, url: `${pathname}${search}`, ...(body === undefined ? {} : { body }) })
    return fetch(input)
  })
  return sent
}

// A form that sends a file is read field by field, each file by its name and type.
async function sentBody(request: Request): Promise<unknown> {
  if ((request.headers.get('Content-Type') ?? '').startsWith('multipart/form-data')) {
    const fields: Record<string, string | SentFile> = {}
    for (const [key, value] of await request.formData()) {
      fields[key] = typeof value === 'string' ? value : { name: value.name, type: value.type }
    }
    return fields
  }
  const body = await request.text()
  return body ? JSON.parse(body) : undefined
}
