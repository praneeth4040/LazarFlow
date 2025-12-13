// Lightweight client-side error logger. Initializes Sentry if DSN is provided,
// otherwise falls back to optional backend reporting and console.

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
let SentryClient = null

if (SENTRY_DSN) {
  // Dynamically import Sentry to keep it optional
  import('@sentry/react')
    .then((mod) => {
      SentryClient = mod
      try {
        SentryClient.init({ dsn: SENTRY_DSN })
        console.info('Sentry initialized')
      } catch (e) {
        console.warn('Sentry init failed', e)
      }
    })
    .catch((err) => {
      console.warn('Sentry package not available', err)
    })
}

export function captureException(error, context = {}) {
  try {
    if (SentryClient && typeof SentryClient.captureException === 'function') {
      SentryClient.captureException(error, { extra: context })
      return
    }

    // Optional backend reporting: only if explicit endpoint is provided
    const endpoint = import.meta.env.VITE_CLIENT_ERROR_ENDPOINT || ''
    if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: String(error), stack: error?.stack, context }),
      }).catch(() => {})
    }

    // Always log to console as well
    console.error('Captured client error:', error, context)
  } catch (err) {
    console.error('captureException failed', err)
  }
}

export default { captureException }
