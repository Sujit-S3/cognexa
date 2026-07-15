import { createApp } from './app'
import { env } from './config/env'
import { connectDatabase, disconnectDatabase } from './config/database'
import { logger } from './config/logger'

async function bootstrap(): Promise<void> {
  await connectDatabase()

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    logger.info(`NEXUS AI server listening on port ${env.PORT} (${env.NODE_ENV})`)
  })

  // Graceful shutdown: stop accepting connections, drain, close the DB, then exit.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`)
    server.close(async () => {
      await disconnectDatabase()
      logger.info('Shutdown complete')
      process.exit(0)
    })
    // Failsafe if connections don't drain in time.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
  })
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting')
    process.exit(1)
  })
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server')
  process.exit(1)
})
