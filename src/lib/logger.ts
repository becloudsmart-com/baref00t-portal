import pino from 'pino'
import { env } from '../env'

let _logger: pino.Logger | null = null

export function logger(): pino.Logger {
  if (!_logger) {
    const e = env()
    _logger = pino({
      level: e.LOG_LEVEL,
      base: { service: 'baref00t-partner-portal' },
      formatters: {
        level: (label) => ({ level: label }),
      },
      // Redact common sensitive patterns. Token-shaped values still leak if
      // they appear in nested objects under unexpected keys, so don't rely
      // on this — never log the raw API key.
      redact: {
        paths: [
          'apiKey',
          'BAREF00T_API_KEY',
          'AZURE_AD_CLIENT_SECRET',
          'AUTH_SECRET',
          'req.headers.authorization',
          'req.headers["x-partner-key"]',
          'req.headers.cookie',
        ],
        censor: '[REDACTED]',
      },
    })
  }
  return _logger
}
