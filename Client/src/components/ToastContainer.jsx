import React from 'react'
import { X } from 'lucide-react'
import './Toast.css'

function Toast({ toast, onRemove }) {
  return (
    <div className={`toast toast-${toast.type || 'info'}`} role="status">
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={() => onRemove(toast.id)} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts = [], onRemove = () => {} }) {
  return (
    <div className="toast-root" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
