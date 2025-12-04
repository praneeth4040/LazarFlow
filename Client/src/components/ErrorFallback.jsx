import React from 'react'

function ErrorFallback({ error }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>We're sorry — an unexpected error occurred.</p>
      <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', margin: '16px auto', maxWidth: 800 }}>
        {error?.toString()}
      </details>
      <button onClick={() => window.location.reload()}>Reload page</button>
    </div>
  )
}

export default ErrorFallback
