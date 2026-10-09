/**
 * The back end's repository, run as it is for development: next to this one by
 * default, elsewhere when E2E_BACK_DIR says so (the CI checks it out inside).
 */
export const BACK_DIR = process.env.E2E_BACK_DIR ?? '../back'
