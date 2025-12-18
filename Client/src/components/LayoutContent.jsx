import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserThemes, deleteThemeByIndex, renameThemeByIndex } from '../lib/dataService';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../hooks/useSubscription';
import './LayoutContent.css';

const LayoutContent = () => {
  const [activeLayout, setActiveLayout] = useState('single');
  const [themes, setThemes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingName, setEditingName] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { limits } = useSubscription();

  const handleLayoutClick = (layout) => {
    const disabledLayouts = ['split', 'card'];
    if (disabledLayouts.includes(layout)) return;
    setActiveLayout(layout);
  };

  const handleCreateNewLayout = async () => {
    // Check layout limit BEFORE navigating to designer
    if (themes.length >= limits.maxLayouts) {
      addToast('error', `You can only have ${limits.maxLayouts} layout(s) on the free tier. Please delete an existing layout or upgrade your plan.`);
      return;
    }
    // Navigate to designer without creating - user will save explicitly
    navigate(`/edit-layout/${activeLayout}`);
  };

  const loadThemes = async () => {
    const arr = await getUserThemes();
    setThemes(arr.map((t, index) => ({ t, index })));
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const filtered = themes.filter(({ t }) => !t.layout || t.layout === activeLayout);

  const handleDelete = async (index) => {
    try {
      await deleteThemeByIndex(index);
      await loadThemes();
      addToast('success', 'Theme deleted successfully');
    } catch {
      addToast('error', 'Failed to delete theme');
    }
  };

  const handleStartRename = (index, currentName) => {
    setEditingIndex(index);
    setEditingName(currentName || '');
  };

  const handleConfirmRename = async () => {
    if (editingIndex == null) return;
    try {
      await renameThemeByIndex(editingIndex, editingName || 'Untitled Theme');
      setEditingIndex(null);
      setEditingName('');
      await loadThemes();
      addToast('success', 'Theme renamed successfully');
    } catch {
      addToast('error', 'Failed to rename theme');
    }
  };

  const handleRedesign = (index) => {
    navigate(`/edit-layout/${activeLayout}?themeIdx=${index}`);
  };

  return (
    <div>
      <div className="layout-selector">
        <div className="layout-card-wrapper">
          <div onClick={() => handleLayoutClick('single')} className={`layout-card ${activeLayout === 'single' ? 'active' : ''}`}>
            <img src="/logo.jpeg" alt="Single Tabular Layout" />
            <div className="card-content">
              <h3>Single Tabular</h3>
              <p>Clean, scoreboard-first layout optimized for live standings, MVP lists, and sponsor slots.</p>
            </div>
          </div>
          <p className="card-description">A classic, single-table view with focused readability and flexible theming.</p>
        </div>
        <div className="layout-card-wrapper">
          <div className="layout-card disabled">
            <img src="/logo.jpeg" alt="Split Tabular Layout" />
            <div className="card-content">
              <h3>Split Tabular</h3>
              <span className="layout-badge">Coming Soon</span>
              <p>Dual-table comparison for side-by-side insights.</p>
            </div>
          </div>
          <p className="card-description">Coming soon: compare brackets, groups, or stages on one screen.</p>
        </div>
        <div className="layout-card-wrapper">
          <div className="layout-card disabled">
            <img src="/logo.jpeg" alt="Card + Tabular Layout" />
            <div className="card-content">
              <h3>Card + Tabular</h3>
              <span className="layout-badge">Coming Soon</span>
              <p>Modern card grid with integrated points table.</p>
            </div>
          </div>
          <p className="card-description">Coming soon: rich player cards with live stats next to standings.</p>
        </div>
      </div>

      <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Themes for {activeLayout}</h3>
          <button onClick={handleCreateNewLayout} className="new-layout-btn">New Layout</button>
        </div>
        <div className="themes-grid">
          {filtered.length === 0 && (
            <p className="no-themes">No themes saved for this layout.</p>
          )}
          {filtered.map(({ t, index }) => (
            <div key={index} className="theme-item">
              {editingIndex === index ? (
                <div className="theme-header">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="theme-name-input"
                    placeholder="Theme name"
                  />
                  <button onClick={handleConfirmRename} className="theme-action-btn">Save</button>
                </div>
              ) : (
                <div className="theme-header">
                  <span className="theme-name">{t?.name || 'Untitled Theme'}</span>
                  <button onClick={() => handleStartRename(index, t?.name)} className="theme-action-btn">Rename</button>
                </div>
              )}
              <div className="theme-preview-row">
                <div className="theme-preview-mini" style={{ background: t?.backgroundColor || '#111827', borderColor: t?.borderColor || '#6b7280' }}>
                  <div style={{ background: t?.headerBackgroundColor || 'transparent', height: 8 }} />
                  <div style={{ background: t?.tableStyles?.header?.backgroundColor || '#1f2937', height: 8 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '12px 28px 12px 12px 12px 12px', gap: 2 }}>
                    <div style={{ background: t?.tableStyles?.rank?.backgroundColor || 'transparent' }} />
                    <div style={{ background: t?.tableStyles?.team?.backgroundColor || 'transparent' }} />
                    <div style={{ background: t?.tableStyles?.wwcd?.backgroundColor || 'transparent' }} />
                    <div style={{ background: t?.tableStyles?.place?.backgroundColor || 'transparent' }} />
                    <div style={{ background: t?.tableStyles?.kills?.backgroundColor || 'transparent' }} />
                    <div style={{ background: t?.tableStyles?.total?.backgroundColor || 'transparent' }} />
                  </div>
                  <div style={{ background: t?.footerBackgroundColor || '#000000', height: 8 }} />
                </div>
              </div>
              <div className="theme-actions">
                <button onClick={() => handleRedesign(index)} className="theme-action-btn">Redesign</button>
                <button onClick={() => handleDelete(index)} className="theme-action-btn danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LayoutContent;
