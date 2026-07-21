import crypto from 'crypto'
import pinoHttp from 'pino-http'
import { logger } from '../config/logger'

export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id']
    const requestId = typeof incoming === 'string' && incoming.length <= 128 ? incoming : crypto.randomUUID()
    res.setHeader('x-request-id', requestId)
    return requestId
  },
  customProps: (req) => ({ requestId: req.id }),
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress }
    },
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    censor: '[REDACTED]',
  },
})
