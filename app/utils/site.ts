/** The name of the committee, as the site and its pages' titles write it. */
export const SITE_NAME = 'Comité des Fêtes d’Ons-en-Bray'

/**
 * How long a public page waits for the API, in milliseconds. The page answers
 * within it even when the API does not: the deployment's health check reads
 * the home page, and gives up after 5 s.
 */
export const PUBLIC_API_TIMEOUT = 4000
