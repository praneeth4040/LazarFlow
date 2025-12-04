import React, { createContext, useContext, useState, useCallback } from 'react'
import ToastContainer from '../components/ToastContainer'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((type, message, options = {}) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, type, message, ...options }])
    if (!options.persistent) {
      const timeout = options.duration || 4000
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id))
      }, timeout)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default ToastContext
