import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { BACK_DIR } from './back-end'

// A fictitious member of the "Bureau" group, identified by their e-mail address:
// loading it again updates the same account.
const BOARD_MEMBER = fileURLToPath(new URL('fixtures/board-member.json', import.meta.url))

function manage(command: string[], env: NodeJS.ProcessEnv = {}): void {
  execFileSync('uv', ['run', 'python', 'manage.py', ...command], {
    cwd: BACK_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
}

/**
 * Readies the back end's database for the journeys: its tables, the cache table
 * the throttling counts in, the board member who signs in, and the fictitious
 * events of the mockup that the public pages show.
 */
export default function globalSetup(): void {
  manage(['migrate', '--noinput'])
  manage(['createcachetable'])
  manage(['loaddata', BOARD_MEMBER])
  // The back end only writes them when its environment allows it: this call
  // does, whatever the back end's own .env says.
  manage(['seed_demo'], { DEMO_DATA_ENABLED: 'true' })
}
