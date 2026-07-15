import { isAiServiceConfigured } from '../../config/env'
import { httpAiProvider } from './httpProvider'
import { mockAiProvider } from './mockProvider'
import { AiServiceProvider } from './types'

export const aiService: AiServiceProvider = isAiServiceConfigured ? httpAiProvider : mockAiProvider

export * from './types'
