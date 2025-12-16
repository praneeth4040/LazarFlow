import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getLatestUserTheme, appendThemeToProfile, uploadBackgroundImage, uploadAsset, getUserThemes } from '../lib/dataService';
import NewLiveTournament from './NewLiveTournament';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Reusable Accordion Section Component
const AccordionSection = ({ title, sectionKey, activeSection, setActiveSection, children }) => {
  const isOpen = activeSection === sectionKey;
  return (
    <div style={{ borderBottom: '1px solid #404040' }}>
      <button 
        onClick={() => setActiveSection(isOpen ? null : sectionKey)}
        style={{
          width: '100%',
          background: isOpen ? '#262626' : 'transparent',
          border: 'none',
          padding: '1rem 1.25rem',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '1rem',
          fontWeight: '600'
        }}
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && (
        <div style={{ padding: '1rem 1.25rem', background: '#0a0a0a' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Reusable Color Picker Component
const ColorPicker = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
      {label}
    </label>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <input 
        type="color" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ 
          width: '40px', 
          height: '40px', 
          border: '1px solid #404040', 
          borderRadius: '4px',
          cursor: 'pointer',
          padding: 0,
          backgroundColor: 'transparent'
        }}
      />
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ 
          flex: 1, 
          background: '#262626', 
          border: '1px solid #404040', 
          color: 'white', 
          padding: '8px', 
          borderRadius: '4px' 
        }}
      />
    </div>
  </div>
);

// Reusable Slider Component
const Slider = ({ label, value, onChange, min, max, step }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
      {label}
    </label>
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ color: 'white', fontSize: '0.875rem', background: '#262626', padding: '4px 8px', borderRadius: '4px' }}>
        {value}px
      </span>
    </div>
  </div>
);


const GOOGLE_FONTS = [
  { name: 'Outfit', value: 'Outfit, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Lato', value: 'Lato, sans-serif' },
  { name: 'Poppins', value: 'Poppins, sans-serif' },
  { name: 'Oswald', value: 'Oswald, sans-serif' },
  { name: 'Raleway', value: 'Raleway, sans-serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Bebas Neue', value: '"Bebas Neue", sans-serif' },
];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'twitter', label: 'Twitter/X', placeholder: 'https://x.com/yourhandle' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/yourchannel' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'discord', label: 'Discord', placeholder: 'https://discord.gg/yourcode' },
  { key: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
];

const EditLayout = () => {
  const { layoutId } = useParams();
  const location = useLocation();
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState('background'); // Default open section
  const [activeTableSection, setActiveTableSection] = useState(null);
  const { addToast } = useToast();

  // Updated config state
  const [config, setConfig] = useState({
    theme: {
      name: 'Untitled Theme',
      backgroundColor: '#ffffff',
      backgroundImage: '', // New property for the image URL
      fontFamily: 'Outfit, sans-serif',
      borderColor: '#e2e8f0',
      tableBackgroundColor: 'transparent',
      rankBadgeBorderRadius: 4,
      tableCellSkew: 0,
      cellGap: 4,
      cellShape: 'square',
      cellCutSize: 8,
      headerBackgroundColor: 'transparent',
      headerTextColor: '#ffffff',
      headerBackgroundImage: '',
      headerLeftSponsor: '',
      headerRightSponsor: '',
      headerCenterLogo: '',
      footerBackgroundColor: '#000000',
      footerTextColor: '#ffffff',
      footerBackgroundImage: '',
      footerLeft: '@LazarFlow',
      footerCenter: 'POWERED BY LAZARFLOW',
      footerRight: 'lazarflow.com',
      footerSocials: [],
      tableStyles: {
        header: {
          backgroundColor: 'transparent',
          textColor: '#1a202c'
        },
        rank: {
          backgroundColor: '',
          textColor: ''
        },
        team: {
          backgroundColor: '',
          textColor: ''
        },
        wwcd: {
          backgroundColor: '',
          textColor: ''
        },
        place: {
          backgroundColor: '',
          textColor: ''
        },
        kills: {
          backgroundColor: '',
          textColor: ''
        },
        total: {
          backgroundColor: '',
          textColor: ''
        }
      }
    },
    tournament: {
      // Optional overrides for preview content
    }
  });

  useEffect(() => {
    const fetchProfileTheme = async () => {
      try {
        const search = new URLSearchParams(location.search);
        const themeIdxParam = search.get('themeIdx');
        if (themeIdxParam != null) {
          const idx = parseInt(themeIdxParam, 10);
          const arr = await getUserThemes();
          const found = arr[idx];
          if (found) {
            setConfig(prev => ({
              ...prev,
              theme: {
                ...prev.theme,
                ...found,
                tableStyles: {
                  ...prev.theme.tableStyles,
                  ...(found.tableStyles || {})
                }
              }
            }));
          }
        } else {
          const loaded = await getLatestUserTheme();
          if (loaded && Object.keys(loaded).length > 0) {
            setConfig(prev => ({
              ...prev,
              theme: {
                ...prev.theme,
                ...loaded,
                tableStyles: {
                  ...prev.theme.tableStyles,
                  ...(loaded.tableStyles || {})
                }
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching profile theme:', error);
      }
    };

    fetchProfileTheme();
  }, [location.search]);

  const handleThemeChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [key]: value
      }
    }));
  };

  const toggleFooterPlatform = (platformKey) => {
    setConfig(prev => {
      const current = prev.theme.footerSocials || [];
      const exists = current.find(p => p.type === platformKey);
      const updated = exists
        ? current.filter(p => p.type !== platformKey)
        : [...current, { type: platformKey, url: '' }];
      return { ...prev, theme: { ...prev.theme, footerSocials: updated } };
    });
  };

  const setFooterPlatformUrl = (platformKey, url) => {
    setConfig(prev => {
      const current = prev.theme.footerSocials || [];
      const updated = current.map(p => p.type === platformKey ? { ...p, url } : p);
      return { ...prev, theme: { ...prev.theme, footerSocials: updated } };
    });
  };

  const handleTournamentChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      tournament: {
        ...prev.tournament,
        [key]: value
      }
    }));
  };

  const handleTableStyleChange = (section, property, value) => {
    setConfig(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        tableStyles: {
          ...prev.theme.tableStyles,
          [section]: {
            ...prev.theme.tableStyles[section],
            [property]: value
          }
        }
      }
    }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadBackgroundImage(file);
      handleThemeChange('backgroundImage', publicUrl);

    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAssetUpload = async (key, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAsset(file);
      handleThemeChange(key, publicUrl);
    } catch (error) {
      console.error('Error uploading asset:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemove = () => {
    // This just removes the image from the config, not from the bucket
    handleThemeChange('backgroundImage', '');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Sidebar - Editor Controls */}
      <div style={{ 
        width: '320px', 
        background: '#171717', 
        borderRight: '1px solid #404040', 
        color: 'white', 
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #404040' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Layout Editor</h2>
          <div style={{ fontSize: '0.875rem', color: '#a3a3a3', marginTop: '0.5rem' }}>
            {layoutId && <span style={{ marginRight: '10px' }}>Layout: {layoutId}</span>}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: '#d4d4d4' }}>Theme Name</label>
            <input
              type="text"
              value={config.theme.name || ''}
              onChange={(e) => handleThemeChange('name', e.target.value)}
              placeholder="Enter theme name"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: '1px solid #404040',
                background: '#0a0a0a',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              onClick={async () => {
                try {
                  await appendThemeToProfile({ ...config.theme, layout: layoutId });
                  addToast('success', 'Theme saved successfully');
                } catch {
                  addToast('error', 'Failed to save theme');
                }
              }}
              style={{
                background: '#22c55e',
                color: '#000',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Save
            </button>
          </div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <AccordionSection 
            title="Background" 
            sectionKey="background" 
            activeSection={activeSection} 
            setActiveSection={setActiveSection}
          >
            <ColorPicker 
              label="Background Color" 
              value={config.theme.backgroundColor}
              onChange={value => handleThemeChange('backgroundColor', value)}
            />

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Font Family
              </label>
              <select
                value={config.theme.fontFamily}
                onChange={(e) => handleThemeChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  background: '#262626',
                  border: '1px solid #404040',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font.name} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
                Background Image
              </label>
              {config.theme.backgroundImage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={config.theme.backgroundImage} alt="Background" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                  <button onClick={handleImageRemove} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                  style={{ 
                    background: '#262626', 
                    border: '1px solid #404040', 
                    color: 'white', 
                    padding: '8px', 
                    borderRadius: '4px',
                    width: '100%'
                  }}
                />
              )}
              {uploading && <p style={{ color: '#a3a3a3', fontSize: '0.875rem', marginTop: '0.5rem' }}>Uploading...</p>}
            </div>
          </AccordionSection>

          <AccordionSection 
            title="Footer" 
            sectionKey="footer" 
            activeSection={activeSection} 
            setActiveSection={setActiveSection}
          >
            <ColorPicker 
              label="Footer Background Color" 
              value={config.theme.footerBackgroundColor}
              onChange={value => handleThemeChange('footerBackgroundColor', value)}
            />
            <ColorPicker 
              label="Footer Text Color" 
              value={config.theme.footerTextColor}
              onChange={value => handleThemeChange('footerTextColor', value)}
            />
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Footer Background Image
              </label>
                {config.theme.footerBackgroundImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={config.theme.footerBackgroundImage} alt="Footer Background" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                    <button onClick={() => handleThemeChange('footerBackgroundImage', '')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const publicUrl = await uploadAsset(file);
                      handleThemeChange('footerBackgroundImage', publicUrl);
                    }}
                    style={{ 
                      background: '#262626', 
                      border: '1px solid #404040', 
                      color: 'white', 
                      padding: '8px', 
                      borderRadius: '4px',
                      width: '100%'
                    }}
                  />
                )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Social Media
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {SOCIAL_PLATFORMS.map(p => {
                  const selected = (config.theme.footerSocials || []).some(s => s.type === p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => toggleFooterPlatform(p.key)}
                      style={{
                        background: selected ? '#1f2937' : 'transparent',
                        border: '1px solid #404040',
                        color: 'white',
                        padding: '8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {(config.theme.footerSocials || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(config.theme.footerSocials || []).map(s => {
                    const platform = SOCIAL_PLATFORMS.find(p => p.key === s.type);
                    return (
                      <div key={s.type}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', color: '#a3a3a3' }}>
                          {platform?.label} Link
                        </label>
                        <input
                          type="text"
                          value={s.url || ''}
                          onChange={(e) => setFooterPlatformUrl(s.type, e.target.value)}
                          placeholder={platform?.placeholder}
                          style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: 'white', padding: '8px', borderRadius: '4px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
                Left
              </label>
              <input
                type="text"
                value={config.theme.footerLeft}
                onChange={(e) => handleThemeChange('footerLeft', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
                Center
              </label>
              <input
                type="text"
                value={config.theme.footerCenter}
                onChange={(e) => handleThemeChange('footerCenter', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
                Right
              </label>
              <input
                type="text"
                value={config.theme.footerRight}
                onChange={(e) => handleThemeChange('footerRight', e.target.value)}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '4px' }}
              />
            </div>
          </AccordionSection>

          {/* Header section can remain for other controls like text color, etc. */}
          <AccordionSection 
            title="Header" 
            sectionKey="header" 
            activeSection={activeSection} 
            setActiveSection={setActiveSection}
          >
            <ColorPicker 
              label="Header Background Color" 
              value={config.theme.headerBackgroundColor}
              onChange={value => handleThemeChange('headerBackgroundColor', value)}
            />
            <ColorPicker 
              label="Header Text Color" 
              value={config.theme.headerTextColor}
              onChange={value => handleThemeChange('headerTextColor', value)}
            />
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Header Background Image
              </label>
              {config.theme.headerBackgroundImage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={config.theme.headerBackgroundImage} alt="Header Background" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                  <button onClick={() => handleThemeChange('headerBackgroundImage', '')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => handleAssetUpload('headerBackgroundImage', e.target.files[0])}
                  style={{ 
                    background: '#262626', 
                    border: '1px solid #404040', 
                    color: 'white', 
                    padding: '8px', 
                    borderRadius: '4px',
                    width: '100%'
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Tournament Name
              </label>
              <input
                type="text"
                value={config.tournament?.name || ''}
                onChange={(e) => handleTournamentChange('name', e.target.value)}
                style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: 'white', padding: '8px', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Sub Title
              </label>
              <input
                type="text"
                value={config.tournament?.subHeading || ''}
                onChange={(e) => handleTournamentChange('subHeading', e.target.value)}
                style={{ width: '100%', background: '#262626', border: '1px solid #404040', color: 'white', padding: '8px', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                  Left Sponsor
                </label>
                {config.theme.headerLeftSponsor ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={config.theme.headerLeftSponsor} alt="Left Sponsor" style={{ width: '80px', height: '50px', objectFit: 'contain', borderRadius: '4px', background: '#0a0a0a' }} />
                    <button onClick={() => handleThemeChange('headerLeftSponsor', '')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => handleAssetUpload('headerLeftSponsor', e.target.files[0])}
                    style={{ background: '#262626', border: '1px solid #404040', color: 'white', padding: '8px', borderRadius: '4px', width: '100%' }}
                  />
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                  Right Sponsor
                </label>
                {config.theme.headerRightSponsor ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={config.theme.headerRightSponsor} alt="Right Sponsor" style={{ width: '80px', height: '50px', objectFit: 'contain', borderRadius: '4px', background: '#0a0a0a' }} />
                    <button onClick={() => handleThemeChange('headerRightSponsor', '')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => handleAssetUpload('headerRightSponsor', e.target.files[0])}
                    style={{ background: '#262626', border: '1px solid #404040', color: 'white', padding: '8px', borderRadius: '4px', width: '100%' }}
                  />
                )}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d4' }}>
                Center Logo
              </label>
              {config.theme.headerCenterLogo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={config.theme.headerCenterLogo} alt="Center Logo" style={{ width: '120px', height: '60px', objectFit: 'contain', borderRadius: '4px', background: '#0a0a0a' }} />
                  <button onClick={() => handleThemeChange('headerCenterLogo', '')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => handleAssetUpload('headerCenterLogo', e.target.files[0])}
                  style={{ background: '#262626', border: '1px solid #404040', color: 'white', padding: '8px', borderRadius: '4px', width: '100%' }}
                />
              )}
            </div>
          </AccordionSection>

          <AccordionSection 
            title="Points Table" 
            sectionKey="pointsTable" 
            activeSection={activeSection} 
            setActiveSection={setActiveSection}
          >
            <AccordionSection
              title="Header Styling"
              sectionKey="header"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.header.backgroundColor}
                onChange={value => handleTableStyleChange('header', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.header.textColor}
                onChange={value => handleTableStyleChange('header', 'textColor', value)}
              />
            </AccordionSection>

            <AccordionSection
              title="Rank Column"
              sectionKey="rank"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.rank.backgroundColor}
                onChange={value => handleTableStyleChange('rank', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.rank.textColor}
                onChange={value => handleTableStyleChange('rank', 'textColor', value)}
              />
            </AccordionSection>

            <AccordionSection
              title="Team Column"
              sectionKey="team"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.team.backgroundColor}
                onChange={value => handleTableStyleChange('team', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.team.textColor}
                onChange={value => handleTableStyleChange('team', 'textColor', value)}
              />
            </AccordionSection>

            <AccordionSection
              title="WWCD Column"
              sectionKey="wwcd"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.wwcd.backgroundColor}
                onChange={value => handleTableStyleChange('wwcd', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.wwcd.textColor}
                onChange={value => handleTableStyleChange('wwcd', 'textColor', value)}
              />
            </AccordionSection>

            <AccordionSection
              title="Place Pts Column"
              sectionKey="place"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.place.backgroundColor}
                onChange={value => handleTableStyleChange('place', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.place.textColor}
                onChange={value => handleTableStyleChange('place', 'textColor', value)}
              />
            </AccordionSection>

            <AccordionSection
              title="Kills Column"
              sectionKey="kills"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.kills.backgroundColor}
                onChange={value => handleTableStyleChange('kills', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.kills.textColor}
                onChange={value => handleTableStyleChange('kills', 'textColor', value)}
              />
            </AccordionSection>

            <AccordionSection
              title="Total Column"
              sectionKey="total"
              activeSection={activeTableSection}
              setActiveSection={setActiveTableSection}
            >
              <ColorPicker 
                label="Background Color" 
                value={config.theme.tableStyles.total.backgroundColor}
                onChange={value => handleTableStyleChange('total', 'backgroundColor', value)}
              />
              <ColorPicker 
                label="Text Color" 
                value={config.theme.tableStyles.total.textColor}
                onChange={value => handleTableStyleChange('total', 'textColor', value)}
              />
            </AccordionSection>

            <ColorPicker 
              label="Table Border Color" 
              value={config.theme.borderColor}
              onChange={value => handleThemeChange('borderColor', value)}
            />
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.theme.borderColor === 'transparent'}
                  onChange={(e) => handleThemeChange('borderColor', e.target.checked ? 'transparent' : '#e2e8f0')}
                  style={{ width: '16px', height: '16px' }}
                />
                Transparent Border
              </label>
            </div>
            <Slider
              label="Cell Shape (Skew)"
              min={-30}
              max={30}
              step={1}
              value={config.theme.tableCellSkew}
              onChange={value => handleThemeChange('tableCellSkew', value)}
            />
            <Slider
              label="Cell Gap"
              min={0}
              max={16}
              step={1}
              value={config.theme.cellGap}
              onChange={value => handleThemeChange('cellGap', value)}
            />
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#cbd5e1' }}>
                Cell Shape
              </label>
              <select
                value={config.theme.cellShape}
                onChange={(e) => handleThemeChange('cellShape', e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '4px'
                }}
              >
                <option value="square">Square</option>
                <option value="rounded">Rounded</option>
                <option value="pill">Pill</option>
                <option value="cut">Cut Corners</option>
              </select>
            </div>
            {config.theme.cellShape === 'cut' && (
              <Slider
                label="Cut Size"
                min={4}
                max={24}
                step={1}
                value={config.theme.cellCutSize}
                onChange={value => handleThemeChange('cellCutSize', value)}
              />
            )}
          </AccordionSection>
          
          
        </div>
      </div>

      {/* Main Content - Live Preview */}
      <div style={{ flex: 1, background: '#f1f5f9', overflow: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            <NewLiveTournament previewConfig={config} />
        </div>
      </div>
    </div>
  );
}

export default EditLayout;
