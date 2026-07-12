import { spawn } from 'node:child_process'

spawn('pnpm', ['lint:js'], {
    stdio: ['inherit', 'pipe', 'pipe'],
})
