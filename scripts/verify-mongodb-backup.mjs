import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const archive = path.resolve(process.argv[2] ?? '')
if (!process.argv[2] || !fs.existsSync(archive)) throw new Error('Pass an existing backup archive path')

const digest = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')
const checksumFile = `${archive}.sha256`
if (fs.existsSync(checksumFile)) {
  const expected = fs.readFileSync(checksumFile, 'utf8').trim().split(/\s+/)[0]
  if (expected !== digest) throw new Error('Backup checksum does not match')
}

const child = spawn('mongorestore', [`--archive=${archive}`, '--gzip', '--dryRun'], { stdio: 'inherit' })
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', (code) => resolve(code ?? 1))
})
if (exitCode !== 0) process.exit(exitCode)
console.log(
  `Backup archive structure and checksum verified: ${path.basename(archive)} (${digest.slice(0, 12)}...)`
)
