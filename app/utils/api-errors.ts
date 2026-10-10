import type { components } from '~/types/api'

type ValidationErrorOut = components['schemas']['ValidationErrorOut']

/** The errors of a 422 answer, laid out on a form. */
export interface FormErrors {
  /** Messages about the form as a whole. */
  form: string[]
  /** Messages by field path: "email", "lines.0.quantity". */
  fields: Record<string, string[]>
}

// The name every operation of the API gives its JSON body.
const BODY_PARAMETER = 'payload'

// Where the API locates an error about a field: the JSON body, or, for a
// multipart form that sends a file, its fields and its files.
const FIELD_SOURCES: ReadonlySet<string | number> = new Set(['body', 'form', 'file'])

/**
 * Lays the errors of a 422 answer out on a form, or returns null for any other
 * error.
 *
 * Ninja locates an error of the body's schema under the operation's parameter
 * (["body", "payload", "email"]), while the services locate theirs under the
 * field itself (["body", "email"]), or under the body when no field is at fault:
 * both land on the same field. A multipart form's fields come without their
 * parameter (["form", "category"]), and its files under their own name
 * (["file", "file"]). Only errors about the body or a form are laid on fields;
 * any other one (query string, path…) goes to the form as a whole, so that none
 * is lost.
 */
export function toFormErrors(error: unknown): FormErrors | null {
  if (!isValidationError(error)) return null
  const errors: FormErrors = { form: [], fields: {} }
  for (const { loc, msg } of error.detail) {
    const [source = '', ...path] = loc
    if (source !== 'file' && path[0] === BODY_PARAMETER) path.shift()
    if (!FIELD_SOURCES.has(source) || path.length === 0) errors.form.push(msg)
    else (errors.fields[path.join('.')] ??= []).push(msg)
  }
  return errors
}

/**
 * Lays out the errors of a form on the fields it shows. An error about any
 * other field goes to the form as a whole, after the name of its field, so
 * that none is lost: « Adresse de la page : Un autre événement utilise déjà
 * cette adresse. ».
 */
export function placeErrors(
  errors: FormErrors,
  shown: ReadonlySet<string>,
  label: (path: string) => string,
): FormErrors {
  const placed: FormErrors = { form: [...errors.form], fields: {} }
  for (const [path, messages] of Object.entries(errors.fields)) {
    if (shown.has(path)) placed.fields[path] = messages
    else placed.form.push(...messages.map(message => `${label(path)} : ${message}`))
  }
  return placed
}

function isValidationError(error: unknown): error is ValidationErrorOut {
  return typeof error === 'object' && error !== null && 'detail' in error && Array.isArray(error.detail)
}

/**
 * A session renewal that failed for the time being: throttled (429) or server
 * error. The session itself may still be valid.
 */
export class SessionRenewalError extends Error {
  readonly status: number
  /** Seconds to wait before renewing again, when the server says so. */
  readonly retryAfter: number | null

  constructor(response: Response) {
    super(`The session could not be renewed (HTTP ${response.status}).`)
    this.name = 'SessionRenewalError'
    this.status = response.status
    const seconds = Number.parseInt(response.headers.get('Retry-After') ?? '', 10)
    this.retryAfter = Number.isNaN(seconds) ? null : seconds
  }
}

const MESSAGES = {
  network: 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.',
  unavailable: 'Le service est momentanément indisponible. Réessayez dans quelques instants.',
  throttled: 'Trop de requêtes. Réessayez dans quelques instants.',
  unexpected: 'Une erreur inattendue est survenue. Réessayez dans quelques instants.',
} as const

/**
 * The message to show a board member for a request that went wrong: the error an
 * answer carried, with that answer, or what a request left unanswered threw.
 *
 * A refusal keeps the reason the API gave, written for the member. A server
 * error never shows its body, which may come from the web server rather than
 * from the API.
 */
export function errorMessage(error: unknown, response?: Response): string {
  const status = error instanceof SessionRenewalError ? error.status : response?.status
  if (status === undefined) return isNetworkFailure(error) ? MESSAGES.network : MESSAGES.unexpected
  if (status >= 500) return MESSAGES.unavailable
  if (hasDetail(error)) return error.detail
  return status === 429 ? MESSAGES.throttled : MESSAGES.unexpected
}

// fetch() rejects with a TypeError when no answer comes, and with a DOMException
// when the request is cut off by its time limit.
function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')
}

function hasDetail(error: unknown): error is { detail: string } {
  return typeof error === 'object' && error !== null && 'detail' in error && typeof error.detail === 'string'
}

/** What a call of the API resolves to (openapi-fetch). */
interface ApiResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/**
 * The data of a successful answer, for the handler of `useAsyncData`.
 *
 * Any other outcome throws an error that carries the status of the answer (503
 * when none came) and the message to show the member, from errorMessage(). A
 * request cancelled by `useAsyncData` itself is left for it to drop.
 */
export async function loadData<T>(request: Promise<ApiResult<T>>): Promise<T> {
  let result: ApiResult<T>
  try {
    result = await request
  }
  catch (failure) {
    if (failure instanceof DOMException && failure.name === 'AbortError') throw failure
    const status = failure instanceof SessionRenewalError ? failure.status : 503
    throw createError({ status, message: errorMessage(failure) })
  }
  const { data, error, response } = result
  if (response.ok) return data as T
  throw createError({ status: response.status, message: errorMessage(error, response) })
}

/** How a write of a form ends: what the API saved, or the errors to show on the form. */
export type Written<T> = { data: T, errors: null } | { data: null, errors: FormErrors }

/**
 * Sends the write of a form. A refusal of its values is laid out for the form
 * (toFormErrors); any other failure becomes a message about the whole form.
 */
export async function formWrite<T>(request: Promise<ApiResult<T>>): Promise<Written<T>> {
  try {
    const { data, error, response } = await request
    if (response.ok) return { data: data as T, errors: null }
    return { data: null, errors: toFormErrors(error) ?? { form: [errorMessage(error, response)], fields: {} } }
  }
  catch (failure) {
    return { data: null, errors: { form: [errorMessage(failure)], fields: {} } }
  }
}

/**
 * Sends a write that has no form of its own, such as a deletion: null once
 * done, or the message to show. A refusal of the API's rules, such as a
 * ticket type still in use, gives its own words.
 */
export async function plainWrite(request: Promise<ApiResult<unknown>>): Promise<string | null> {
  try {
    const { error, response } = await request
    if (response.ok) return null
    const refusal = toFormErrors(error)
    return refusal ? [...refusal.form, ...Object.values(refusal.fields).flat()].join(' ') : errorMessage(error, response)
  }
  catch (failure) {
    return errorMessage(failure)
  }
}
