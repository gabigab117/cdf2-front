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

/**
 * Lays the errors of a 422 answer out on a form, or returns null for any other
 * error.
 *
 * Ninja locates an error of the body's schema under the operation's parameter
 * (["body", "payload", "email"]), while the services locate theirs under the
 * field itself (["body", "email"]), or under the body when no field is at fault:
 * both land on the same field. Only errors about the body are laid on fields; any
 * other one (query string, path…) goes to the form as a whole, so that none is
 * lost.
 */
export function toFormErrors(error: unknown): FormErrors | null {
  if (!isValidationError(error)) return null
  const errors: FormErrors = { form: [], fields: {} }
  for (const { loc, msg } of error.detail) {
    const [source, ...path] = loc
    if (source === 'body' && path[0] === BODY_PARAMETER) path.shift()
    if (source !== 'body' || path.length === 0) errors.form.push(msg)
    else (errors.fields[path.join('.')] ??= []).push(msg)
  }
  return errors
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
