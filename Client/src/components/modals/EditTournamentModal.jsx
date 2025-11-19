import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { X } from 'lucide-react'
import './EditTournamentModal.css'

function EditTournamentModal({ isOpen, onClose, tournament, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    game: 'freeFire',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && tournament) {
      setFormData({
        name: tournament.name || '',
        game: tournament.game || 'freeFire',
      })
    }
  }, [isOpen, tournament])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter a tournament name')
      return
    }

    try {
      setLoading(true)
      console.log('📝 Updating tournament...')

      const { error } = await supabase
        .from('tournaments')
        .update({
          name: formData.name,
          game: formData.game,
        })
        .eq('id', tournament.id)

      if (error) throw error

      console.log('✅ Tournament updated successfully')
      alert('✅ Tournament updated successfully!')
      onUpdate()
      onClose()
    } catch (err) {
      console.error('❌ Error updating tournament:', err)
      alert(`Failed to update tournament: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTournament = async () => {
    if (!window.confirm(`Are you sure you want to delete "${tournament.name}"? This cannot be undone!`)) {
      return
    }

    try {
      setLoading(true)
      console.log('🗑️ Deleting tournament...')

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournament.id)

      if (error) throw error

      console.log('✅ Tournament deleted successfully')
      alert(`✅ "${tournament.name}" deleted!`)
      onUpdate()
      onClose()
    } catch (err) {
      console.error('❌ Error deleting tournament:', err)
      alert(`Failed to delete tournament: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !tournament) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-header">
          <h2>Edit Tournament</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="edit-content">
            <div className="form-group">
              <label htmlFor="name">Tournament Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter tournament name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                name="game"
                value={formData.game}
                onChange={handleInputChange}
                required
              >
                <option value="freeFire">Free Fire</option>
                <option value="bgmi">BGMI</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <button
                type="button"
                className="btn-delete"
                onClick={handleDeleteTournament}
                disabled={loading}
              >
                Delete Tournament
              </button>
            </div>
          </div>

          <div className="edit-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTournamentModal
