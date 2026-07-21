import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = path.join(workspace, 'web', 'src', 'assets')
const sources = ['ai_robotics', 'web_mastery', 'student_avatar']

await Promise.all(
  sources.map((name) =>
    sharp(path.join(assets, `${name}.png`))
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(assets, `${name}.webp`))
  )
)

console.log(`Optimized ${sources.length} Cognexa assets.`)
