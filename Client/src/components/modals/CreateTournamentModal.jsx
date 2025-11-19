import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import './CreateTournamentModal.css';

const CreateTournamentModal = ({ isOpen, onClose, onSubmit }) => {
  const defaultPointsSystems = {
    freeFire: [
      { placement: 1, points: 12 },
      { placement: 2, points: 9 },
      { placement: 3, points: 8 },
      { placement: 4, points: 7 },
      { placement: 5, points: 6 },
      { placement: 6, points: 5 },
      { placement: 7, points: 4 },
      { placement: 8, points: 3 },
      { placement: 9, points: 2 },
      { placement: 10, points: 1 },
      { placement: 11, points: 0 },
      { placement: 12, points: 0 },
      { placement: '13-60', points: 0 },
    ],
    bgmi: [
      { placement: 1, points: 10 },
      { placement: 2, points: 6 },
      { placement: 3, points: 5 },
      { placement: 4, points: 4 },
      { placement: 5, points: 3 },
      { placement: 6, points: 2 },
      { placement: 7, points: 1 },
      { placement: 8, points: 1 },
      { placement: '9-60', points: 0 },
    ],
    other: [
      { placement: 1, points: 10 },
      { placement: 2, points: 8 },
      { placement: 3, points: 6 },
      { placement: 4, points: 4 },
      { placement: 5, points: 2 },
      { placement: '6-60', points: 0 },
    ],
  };

  const [formData, setFormData] = useState({
    name: '',
    game: 'freeFire',
  });

  const [pointsSystem, setPointsSystem] = useState(defaultPointsSystems.freeFire);
  const [killPoints, setKillPoints] = useState(1);
  const [placementCount, setPlacementCount] = useState(12);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset points system when game changes
    if (name === 'game') {
      const defaultSystem = [...defaultPointsSystems[value]];
      // Remove range row from default system
      const hasRangeRow = typeof defaultSystem[defaultSystem.length - 1].placement === 'string';
      const numericSystem = hasRangeRow ? defaultSystem.slice(0, -1) : defaultSystem;

      setPointsSystem(numericSystem);
      setPlacementCount(numericSystem.length);
    }
  };

  const handlePlacementCountChange = (e) => {
    const count = parseInt(e.target.value);
    if (isNaN(count) || count < 1) return;

    setPlacementCount(count);

    setPointsSystem(prevSystem => {
      // Create a copy of the previous system
      const currentSystem = [...prevSystem];

      // Check for and remove existing range row
      const lastRow = currentSystem[currentSystem.length - 1];
      const hasRangeRow = lastRow && typeof lastRow.placement === 'string';

      // Get only the numeric placement rows
      const numericRows = hasRangeRow ? currentSystem.slice(0, -1) : currentSystem;

      let newSystem = [];

      // Rebuild the system with the new count - only exact positions
      for (let i = 0; i < count; i++) {
        if (i < numericRows.length) {
          // Keep existing row data but update placement number
          newSystem.push({ ...numericRows[i], placement: i + 1 });
        } else {
          // Add new row
          newSystem.push({ placement: i + 1, points: 0 });
        }
      }

      return newSystem;
    });
  };

  const handlePointsChange = (index, newPoints) => {
    const updatedSystem = [...pointsSystem];
    updatedSystem[index].points = parseInt(newPoints) || 0;
    setPointsSystem(updatedSystem);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({
        ...formData,
        pointsSystem: pointsSystem,
        killPoints: killPoints,
      });
      setFormData({ name: '', game: 'freeFire' });
      setPointsSystem([...defaultPointsSystems.freeFire]);
      setKillPoints(1);
    } else {
      alert('Please enter a tournament name');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Tournament</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tournament Name */}
          <div className="form-group">
            <label htmlFor="name">Tournament Name *</label>
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

          {/* Game Selection */}
          <div className="form-group">
            <label htmlFor="game">Game *</label>
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

          {/* Placement Count */}
          <div className="form-group">
            <label htmlFor="placementCount">Number of Positions</label>
            <input
              type="number"
              id="placementCount"
              min="1"
              max="100"
              value={placementCount}
              onChange={handlePlacementCountChange}
              className="form-control"
            />
          </div>

          {/* Points System Display */}
          <div className="form-group">
            <label>Points System ({formData.game === 'freeFire' ? 'Free Fire' : formData.game === 'bgmi' ? 'BGMI' : 'Other'})</label>
            <div className="points-system-table">
              <div className="table-header">
                <div className="table-cell placement-col">Placement</div>
                <div className="table-cell points-col">Points</div>
              </div>
              <div className="table-body">
                {pointsSystem.map((row, idx) => (
                  <div key={idx} className="table-row">
                    <div className="table-cell placement-col">#{row.placement}</div>
                    <div className="table-cell points-col">
                      <div className="points-slider-container">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={row.points}
                          onChange={(e) => handlePointsChange(idx, e.target.value)}
                          className="points-slider"
                        />
                        <span className="points-value">{row.points}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="kill-points-info">
              <span><Sparkles size={16} /></span>
              <span>Per Kill: </span>
              <div className="kill-points-slider-container">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={killPoints}
                  onChange={(e) => setKillPoints(parseInt(e.target.value) || 0)}
                  className="points-slider"
                />
                <span className="kill-points-value">{killPoints}</span>
              </div>
              <span>point{killPoints !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-create">
              Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
