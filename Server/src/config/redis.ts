import { createClient, type RedisClientType } from 'redis'
import { env, isRedisConfigured } from './env'
import { logger } from './logger'

type CognexaRedisClient = RedisClientType

export const redisClient: CognexaRedisClient | undefined = isRedisConfigured
  ? createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 5_000),
      },
    })
  : undefined

redisClient?.on('error', (error) => logger.error({ err: error }, 'Redis client error'))
redisClient?.on('reconnecting', () => logger.warn('Redis client reconnecting'))

export async function connectRedis(): Promise<void> {
  if (!redisClient || redisClient.isOpen) return

  try {
    await redisClient.connect()
    logger.info('Connected to Redis')
  } catch (error) {
    if (env.REDIS_REQUIRED) throw error
    logger.warn({ err: error }, 'Redis unavailable; optional distributed features are degraded')
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient?.isOpen) await redisClient.quit()
}

export async function pingRedis(): Promise<'connected' | 'disconnected' | 'not-configured'> {
  if (!redisClient) return 'not-configured'
  if (!redisClient.isReady) return 'disconnected'

  try {
    return (await redisClient.ping()) === 'PONG' ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}
