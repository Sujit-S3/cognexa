import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const uri = process.env.MONGODB_ATLAS_URI
if (!uri) throw new Error('MONGODB_ATLAS_URI is required')

const requestedOutput = process.argv[2]
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const output = path.resolve(requestedOutput ?? `cognexa-backup-${stamp}.archive.gz`)
fs.mkdirSync(path.dirname(output), { recursive: true })

const child = spawn('mongodump', [`--uri=${uri}`, `--archive=${output}`, '--gzip'], { stdio: 'inherit' })
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', (code) => resolve(code ?? 1))
})
if (exitCode !== 0) process.exit(exitCode)

const digest = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')
fs.writeFileSync(`${output}.sha256`, `${digest}  ${path.basename(output)}\n`, { flag: 'wx' })
console.log(
  `Encrypted-at-rest backup archive created at ${output}; protect it with restricted storage access.`
)
