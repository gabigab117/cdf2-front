import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BACK_DIR } from './back-end'

// A fictitious member of the "Bureau" group, identified by their e-mail address:
// loading it again updates the same account.
const BOARD_MEMBER = fileURLToPath(new URL('fixtures/board-member.json', import.meta.url))

/**
 * Readies the back end's database for the journeys: its tables, the cache table
 * the throttling counts in, and the board member who signs in.
 */
export default function globalSetup(): void {
  const commands = [['migrate', '--noinput'], ['createcachetable'], ['loaddata', BOARD_MEMBER]]
  for (const command of commands) {
    execFileSync('uv', ['run', 'python', 'manage.py', ...command], { cwd: BACK_DIR, stdio: 'inherit' })
  }
}
