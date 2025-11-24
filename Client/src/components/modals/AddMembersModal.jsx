import React, { useState, useEffect } from 'react'
import { X, User, Check } from 'lucide-react'
import './AddMembersModal.css'

const AddMembersModal = ({ isOpen, onClose, teamName, currentMembers = [], onSave }) => {
    const [members, setMembers] = useState(['', '', '', '', ''])

    useEffect(() => {
        if (isOpen) {
            // Initialize with existing members or empty strings
            const initialMembers = [...currentMembers]
            // Fill up to 5 slots
            while (initialMembers.length < 5) {
                initialMembers.push('')
            }
            // Trim to max 5 just in case
            setMembers(initialMembers.slice(0, 5))
        }
    }, [isOpen, currentMembers])

    const handleMemberChange = (index, value) => {
        const newMembers = [...members]
        newMembers[index] = value
        setMembers(newMembers)
    }

    const handleSave = () => {
        // Filter out empty strings
        const validMembers = members.filter(m => m.trim() !== '')
        onSave(validMembers)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Members - {teamName}</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    {members.map((member, index) => (
                        <div key={index} className="member-input-group">
                            <label>Member {index + 1}</label>
                            <div className="member-input-wrapper">
                                <User size={16} className="member-icon" />
                                <input
                                    type="text"
                                    className="member-input"
                                    value={member}
                                    onChange={(e) => handleMemberChange(index, e.target.value)}
                                    placeholder={`Enter name for Member ${index + 1}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-save" onClick={handleSave}>
                        <Check size={16} /> Save Members
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddMembersModal
