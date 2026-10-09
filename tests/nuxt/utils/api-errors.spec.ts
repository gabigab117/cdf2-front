import { describe, expect, it } from 'vitest'

describe('toFormErrors', () => {
  it('lays an error of the body\'s schema on its field', () => {
    /**
     * Given a 422 from Ninja, located under the body's parameter
     * Then the error lands on the field itself
     */
    const error = { detail: [{ type: 'missing', loc: ['body', 'payload', 'password'], msg: 'Field required' }] }

    expect(toFormErrors(error)).toEqual({ form: [], fields: { password: ['Field required'] } })
  })

  it('lays the errors of a service on their field, or on the form', () => {
    /**
     * Given a 422 from a service: one error on a field, one on no field
     * Then the first lands on its field and the second on the form
     */
    const error = {
      detail: [
        { type: 'validation_error', loc: ['body', 'name'], msg: 'Ce champ est obligatoire.' },
        { type: 'validation_error', loc: ['body'], msg: 'Conflit de dates.' },
      ],
    }

    expect(toFormErrors(error)).toEqual({
      form: ['Conflit de dates.'],
      fields: { name: ['Ce champ est obligatoire.'] },
    })
  })

  it('names a nested field by its path, and gathers its messages', () => {
    /**
     * Given two errors on a field of a list's item
     * Then both land on the path of that field
     */
    const error = {
      detail: [
        { type: 'greater_than', loc: ['body', 'payload', 'lines', 0, 'quantity'], msg: 'Input should be greater than 0' },
        { type: 'int_type', loc: ['body', 'payload', 'lines', 0, 'quantity'], msg: 'Input should be a valid integer' },
      ],
    }

    expect(toFormErrors(error)?.fields).toEqual({
      'lines.0.quantity': ['Input should be greater than 0', 'Input should be a valid integer'],
    })
  })

  it('lays on the form the errors that concern no field', () => {
    /**
     * Given errors on the query string and on the body as a whole
     * Then they land on the form, so that none is lost
     */
    const error = {
      detail: [
        { type: 'int_parsing', loc: ['query', 'page'], msg: 'Input should be a valid integer' },
        { type: 'model_attributes_type', loc: ['body', 'payload'], msg: 'Input should be a valid dictionary' },
      ],
    }

    expect(toFormErrors(error)).toEqual({
      form: ['Input should be a valid integer', 'Input should be a valid dictionary'],
      fields: {},
    })
  })

  it.each([
    ['a refusal with its message', { detail: 'Identifiants invalides.' }],
    ['a body that is not JSON', 'Bad Gateway'],
    ['no body', undefined],
  ])('returns null for %s', (_case, error) => {
    expect(toFormErrors(error)).toBeNull()
  })
})

describe('errorMessage', () => {
  it.each([401, 403, 429])('keeps the reason the API gave for a %i', (status) => {
    /**
     * Given a refusal whose reason the API wrote for the member
     * Then that reason is the message
     */
    const error = { detail: 'Accès réservé aux membres du bureau.' }

    expect(errorMessage(error, new Response(null, { status }))).toBe('Accès réservé aux membres du bureau.')
  })

  it.each([
    ['a server error', 500, { detail: 'Internal Server Error' }],
    ['a gateway that has no API behind it', 502, '<html>Bad Gateway</html>'],
  ])('never shows the body of %s', (_case, status, error) => {
    expect(errorMessage(error, new Response(null, { status }))).toBe(
      'Le service est momentanément indisponible. Réessayez dans quelques instants.',
    )
  })

  it('says to wait when the server throttles without saying why', () => {
    expect(errorMessage(undefined, new Response(null, { status: 429 }))).toBe(
      'Trop de requêtes. Réessayez dans quelques instants.',
    )
  })

  it.each([
    ['a network failure', new TypeError('Failed to fetch')],
    ['a request cut off by its time limit', new DOMException('The operation timed out.', 'TimeoutError')],
  ])('points at the connection after %s', (_case, error) => {
    expect(errorMessage(error)).toBe('Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.')
  })

  it.each([
    ['throttled', 429, 'Trop de requêtes. Réessayez dans quelques instants.'],
    ['refused by a failing server', 503, 'Le service est momentanément indisponible. Réessayez dans quelques instants.'],
  ])('explains a renewal %s', (_case, status, message) => {
    expect(errorMessage(new SessionRenewalError(new Response(null, { status })))).toBe(message)
  })

  it.each([
    ['an error of the code itself', new RangeError('Invalid array length'), undefined],
    ['an answer the API does not explain', undefined, new Response(null, { status: 404 })],
  ])('falls back to a general message for %s', (_case, error, response) => {
    expect(errorMessage(error, response)).toBe('Une erreur inattendue est survenue. Réessayez dans quelques instants.')
  })
})

describe('SessionRenewalError', () => {
  it.each([
    ['in seconds', { 'Retry-After': '30' }, 30],
    ['as a date', { 'Retry-After': 'Fri, 09 Oct 2026 08:00:00 GMT' }, null],
    ['not at all', {}, null],
  ])('reads the delay to wait when the server gives it %s', (_case, headers, retryAfter) => {
    const error = new SessionRenewalError(new Response(null, { status: 429, headers }))

    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(retryAfter)
  })
})
