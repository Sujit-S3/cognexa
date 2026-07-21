import crypto from 'crypto'
import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/database'
import { logger } from '../config/logger'
import { migrations, type Migration } from './migrations'

interface AppliedMigration {
  _id: string
  checksum: string
  appliedAt: Date
}

function checksum(migration: Migration): string {
  return crypto
    .createHash('sha256')
    .update(`${migration.id}\n${migration.description}\n${migration.up.toString()}`)
    .digest('hex')
}

function validateDefinitions(): void {
  const ids = new Set<string>()
  for (const migration of migrations) {
    if (!/^\d{12,14}-[a-z0-9-]+$/.test(migration.id)) {
      throw new Error(`Invalid migration id: ${migration.id}`)
    }
    if (ids.has(migration.id)) throw new Error(`Duplicate migration id: ${migration.id}`)
    ids.add(migration.id)
  }
}

async function status(): Promise<void> {
  const collection = mongoose.connection.collection<AppliedMigration>('schema_migrations')
  const applied = new Map((await collection.find().toArray()).map((item) => [item._id, item]))

  for (const migration of migrations) {
    const record = applied.get(migration.id)
    const state = record
      ? record.checksum === checksum(migration)
        ? 'applied'
        : 'checksum-mismatch'
      : 'pending'
    logger.info({ migration: migration.id, state }, migration.description)
  }
}

async function up(): Promise<void> {
  const collection = mongoose.connection.collection<AppliedMigration>('schema_migrations')
  await collection.createIndex({ appliedAt: 1 })

  for (const migration of migrations) {
    const existing = await collection.findOne({ _id: migration.id })
    const expectedChecksum = checksum(migration)
    if (existing) {
      if (existing.checksum !== expectedChecksum) {
        throw new Error(`Applied migration ${migration.id} was modified after release`)
      }
      continue
    }

    logger.info({ migration: migration.id }, 'Applying database migration')
    await migration.up(mongoose.connection)
    await collection.insertOne({
      _id: migration.id,
      checksum: expectedChecksum,
      appliedAt: new Date(),
    })
  }
}

async function down(): Promise<void> {
  const collection = mongoose.connection.collection<AppliedMigration>('schema_migrations')
  const latest = await collection.find().sort({ appliedAt: -1 }).limit(1).next()
  if (!latest) {
    logger.info('No applied migration to roll back')
    return
  }

  const migration = migrations.find((candidate) => candidate.id === latest._id)
  if (!migration?.down) {
    throw new Error(
      `Migration ${latest._id} is intentionally additive and has no destructive rollback; roll back the application image instead`
    )
  }

  await migration.down(mongoose.connection)
  await collection.deleteOne({ _id: latest._id })
  logger.info({ migration: latest._id }, 'Rolled back database migration')
}

async function main(): Promise<void> {
  validateDefinitions()
  const command = process.argv[2] ?? 'status'
  if (command === 'validate') {
    logger.info({ count: migrations.length }, 'Migration definitions are valid')
    return
  }

  await connectDatabase()
  try {
    if (command === 'up') await up()
    else if (command === 'down') await down()
    else if (command === 'status') await status()
    else throw new Error(`Unknown migration command: ${command}`)
  } finally {
    await disconnectDatabase()
  }
}

void main().catch((error) => {
  logger.fatal({ error }, 'Migration command failed')
  process.exitCode = 1
})
