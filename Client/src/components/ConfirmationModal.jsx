import React from 'react'
import './ConfirmationModal.css'

export default function ConfirmationModal({ isOpen, title = 'Confirm', message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="confirm-overlay">
      <div className="confirm-container" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
