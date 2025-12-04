// Lightweight client-side error logger. Initializes Sentry if DSN is provided,
// otherwise falls back to posting to a backend endpoint (if available) and console.

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

    // Fallback: try to POST to a backend logging route if present
    try {
      const base = import.meta.env.VITE_API_BASE_URL || ''
      if (base) {
        fetch(`${base}/api/client-errors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: String(error), stack: error?.stack, context }),
        }).catch(() => {
          // ignore
        })
      }
    } catch (e) {
      // ignore
    }

    // Always log to console as well
    // eslint-disable-next-line no-console
    console.error('Captured client error:', error, context)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('captureException failed', e)
  }
}

export default { captureException }
