import mongoose from 'mongoose'
import { inject } from 'vitest'

// Each test file gets its own logical database on the shared mongod (see globalSetup.ts) so
// parallel files never see each other's data, without paying to start a mongod per file.
export async function connectTestDb(): Promise<void> {
  const dbName = `test-${process.pid}-${Math.random().toString(36).slice(2)}`
  await mongoose.connect(inject('mongoUri'), { dbName })
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
}

export async function clearTestDb(): Promise<void> {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))
  )
}
