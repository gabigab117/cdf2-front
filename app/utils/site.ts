/** The name of the committee, as the site and its pages' titles write it. */
export const SITE_NAME = 'Comité des Fêtes d’Ons-en-Bray'

/** The legal notice, served without scripts (routeRules of nuxt.config.ts). */
export const LEGAL_NOTICE_PATH = '/mentions-legales'

/** What the site does with personal data, and for how long. */
export const PRIVACY_PATH = '/donnees-personnelles'

/**
 * How long a public page waits for the API, in milliseconds. The page answers
 * within it even when the API does not: the deployment's health check reads
 * the home page, and gives up after 5 s.
 */
export const PUBLIC_API_TIMEOUT = 4000
