import type { TestProject } from 'vitest/node'
import { MongoMemoryServer } from 'mongodb-memory-server'

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string
  }
}

// Runs once for the whole test run (not per file) so parallel test files share a single
// downloaded binary and a single mongod process instead of racing to download/start their own.
export default async function setup(project: TestProject) {
  const mongod = await MongoMemoryServer.create()
  project.provide('mongoUri', mongod.getUri())

  return async () => {
    await mongod.stop()
  }
}
