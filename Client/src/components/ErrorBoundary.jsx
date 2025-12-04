import React from 'react'
import ErrorFallback from './ErrorFallback'
import { captureException } from '../lib/errorLogger'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Send caught errors to the configured logging service (Sentry) or fallback
    try {
      captureException(error, { info })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary logging failed', e)
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

export default ErrorBoundary
