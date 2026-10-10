import { describe, expect, it } from 'vitest'

describe('toFormErrors', () => {
  it('lays an error of the body\'s schema on its field', () => {
    /**
     * Given a 422 from Ninja, located under the body's parameter
     * Then the error lands on the field itself
     */
    const error = { detail: [{ type: 'missing', loc: ['body', 'payload', 'password'], msg: 'Ce champ est obligatoire.' }] }

    expect(toFormErrors(error)).toEqual({ form: [], fields: { password: ['Ce champ est obligatoire.'] } })
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
        { type: 'int_parsing', loc: ['body', 'payload', 'lines', 0, 'quantity'], msg: 'Saisissez un nombre entier.' },
        { type: 'validation_error', loc: ['body', 'lines', 0, 'quantity'], msg: 'Il n’en reste que 3.' },
      ],
    }

    expect(toFormErrors(error)?.fields).toEqual({
      'lines.0.quantity': ['Saisissez un nombre entier.', 'Il n’en reste que 3.'],
    })
  })

  it('lays on the form the errors that concern no field', () => {
    /**
     * Given errors on the query string and on the body as a whole
     * Then they land on the form, so that none is lost
     */
    const error = {
      detail: [
        { type: 'int_parsing', loc: ['query', 'page'], msg: 'Saisissez un nombre entier.' },
        { type: 'missing', loc: ['body', 'payload'], msg: 'Ce champ est obligatoire.' },
      ],
    }

    expect(toFormErrors(error)).toEqual({
      form: ['Saisissez un nombre entier.', 'Ce champ est obligatoire.'],
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

describe('placeErrors', () => {
  it('keeps the errors of the fields shown, and moves the others to the form after their name', () => {
    /**
     * Given errors on a field the form shows and on a field it does not
     * Then the first stays under its field, and the second goes to the form,
     * so that none is lost
     */
    const errors = {
      form: ['La fin de l’événement ne peut pas précéder son début.'],
      fields: {
        title: ['Ce champ ne peut pas être vide.'],
        slug: ['Un autre événement utilise déjà cette adresse.'],
      },
    }

    const placed = placeErrors(errors, new Set(['title']), path => (path === 'slug' ? 'Adresse de la page' : path))

    expect(placed).toEqual({
      form: [
        'La fin de l’événement ne peut pas précéder son début.',
        'Adresse de la page : Un autre événement utilise déjà cette adresse.',
      ],
      fields: { title: ['Ce champ ne peut pas être vide.'] },
    })
  })
})

describe('loadData', () => {
  function answer(status: number, body: { data?: unknown, error?: unknown }) {
    return Promise.resolve({ ...body, response: new Response(null, { status }) })
  }

  it('gives the data of a successful answer', async () => {
    expect(await loadData(answer(200, { data: { count: 0, items: [] } }))).toEqual({ count: 0, items: [] })
  })

  it.each([
    ['a refusal, with its reason', 404, { detail: 'Introuvable.' }, 'Introuvable.'],
    ['a server error, without its body', 502, 'Bad Gateway', 'Le service est momentanément indisponible. Réessayez dans quelques instants.'],
  ])('throws for %s', async (_case, status, error, message) => {
    await expect(loadData(answer(status, { error }))).rejects.toMatchObject({ status, message })
  })

  it.each([
    ['the network', new TypeError('Failed to fetch'), 503, 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.'],
    ['a renewal throttled', new SessionRenewalError(new Response(null, { status: 429 })), 429, 'Trop de requêtes. Réessayez dans quelques instants.'],
  ])('throws when %s fails the request', async (_case, failure, status, message) => {
    await expect(loadData(Promise.reject(failure))).rejects.toMatchObject({ status, message })
  })

  it('lets through a request cancelled by useAsyncData itself', async () => {
    const cancelled = new DOMException('The operation was aborted.', 'AbortError')

    await expect(loadData(Promise.reject(cancelled))).rejects.toBe(cancelled)
  })
})

describe('formWrite', () => {
  function answer(status: number, body: { data?: unknown, error?: unknown }) {
    return Promise.resolve({ ...body, response: new Response(null, { status }) })
  }

  it('gives what the API saved', async () => {
    expect(await formWrite(answer(201, { data: { id: 31 } }))).toEqual({ data: { id: 31 }, errors: null })
  })

  it('lays a refusal of the values out for the form', async () => {
    const error = { detail: [{ type: 'validation_error', loc: ['body', 'text'], msg: 'Ce champ ne peut pas être vide.' }] }

    expect(await formWrite(answer(422, { error }))).toEqual({
      data: null,
      errors: { form: [], fields: { text: ['Ce champ ne peut pas être vide.'] } },
    })
  })

  // Each request is made by its test: a rejection made beforehand would go unhandled.
  it.each([
    ['a server error', () => answer(502, { error: 'Bad Gateway' }), 'Le service est momentanément indisponible. Réessayez dans quelques instants.'],
    ['the network', () => Promise.reject(new TypeError('Failed to fetch')), 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.'],
  ])('tells the whole form when %s fails the write', async (_case, request, message) => {
    expect(await formWrite(request())).toEqual({ data: null, errors: { form: [message], fields: {} } })
  })
})

describe('plainWrite', () => {
  function answer(status: number, error?: unknown) {
    return Promise.resolve({ error, response: new Response(null, { status }) })
  }

  it('gives nothing once done', async () => {
    expect(await plainWrite(answer(204))).toBeNull()
  })

  it.each([
    ['a refusal of the API\'s rules, in its own words', () => answer(422, { detail: [
      { type: 'validation_error', loc: ['body'], msg: 'Impossible de supprimer « Menu enfant » :' },
      { type: 'validation_error', loc: ['body', 'name'], msg: 'des réservations l’utilisent.' },
    ] }), 'Impossible de supprimer « Menu enfant » : des réservations l’utilisent.'],
    ['a refusal with its reason', () => answer(404, { detail: 'Introuvable.' }), 'Introuvable.'],
    ['the network', () => Promise.reject(new TypeError('Failed to fetch')), 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.'],
  ])('says why it failed on %s', async (_case, request, message) => {
    expect(await plainWrite(request())).toBe(message)
  })
})
