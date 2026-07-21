import mongoose from 'mongoose'
import { env, isAiServiceConfigured, isCloudinaryConfigured } from '../config/env'
import { pingRedis } from '../config/redis'

export type DependencyState = 'connected' | 'disconnected' | 'configured' | 'not-configured'

export interface DependencyHealth {
  status: 'ready' | 'degraded' | 'not-ready'
  checks: {
    database: DependencyState
    redis: DependencyState
    storage: DependencyState
    aiProvider: DependencyState
  }
}

async function probe(url: string | undefined): Promise<DependencyState> {
  if (!url) return 'configured'

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(2_000),
      headers: { 'user-agent': 'cognexa-health-probe/1.0' },
    })
    return response.ok ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}

export async function getDependencyHealth(includeOptionalProbes = true): Promise<DependencyHealth> {
  const database: DependencyState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  const [redis, storage, aiProvider] = await Promise.all([
    pingRedis(),
    isCloudinaryConfigured
      ? includeOptionalProbes
        ? probe(env.STORAGE_HEALTHCHECK_URL)
        : Promise.resolve<DependencyState>('configured')
      : Promise.resolve<DependencyState>('not-configured'),
    isAiServiceConfigured
      ? includeOptionalProbes
        ? probe(env.AI_HEALTHCHECK_URL)
        : Promise.resolve<DependencyState>('configured')
      : Promise.resolve<DependencyState>('not-configured'),
  ])

  const requiredReady = database === 'connected' && (!env.REDIS_REQUIRED || redis === 'connected')
  const optionalDegraded =
    redis === 'disconnected' || storage === 'disconnected' || aiProvider === 'disconnected'

  return {
    status: requiredReady ? (optionalDegraded ? 'degraded' : 'ready') : 'not-ready',
    checks: { database, redis, storage, aiProvider },
  }
}
