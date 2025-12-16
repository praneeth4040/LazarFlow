import React from 'react'

const LiveHeader = ({ tournament, themeSource }) => {
    return (
        <header className="live-header">
            {/* Left Sponsor / Game Logo */}
            <div className="header-left">
                <div className="sponsor-box">
                    {themeSource?.headerLeftSponsor ? (
                        <img
                            src={themeSource.headerLeftSponsor}
                            alt="Sponsor"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <span>SPONSOR</span>
                    )}
                </div>
            </div>

            {/* Center Title */}
            <div className="header-center">
                <div className="header-title-wrapper">
                    <div
                        className="tournament-logo-container"
                        style={{ display: themeSource?.headerCenterLogo ? 'block' : 'none' }}
                    >
                        {themeSource?.headerCenterLogo && (
                            <img
                                src={themeSource.headerCenterLogo}
                                alt="Logo"
                                style={{ width: '120px', height: '60px', objectFit: 'contain' }}
                            />
                        )}
                    </div>
                    <div className="header-text-content">
                        <h1 className="main-title">{tournament?.name || 'TOURNAMENT NAME'}</h1>
                        <h2 className="sub-title">{tournament?.sub_heading || 'OVERALL STANDINGS'}</h2>
                    </div>
                </div>
            </div>

            {/* Right Sponsor */}
            <div className="header-right">
                <div className="sponsor-box">
                    {themeSource?.headerRightSponsor ? (
                        <img
                            src={themeSource.headerRightSponsor}
                            alt="Game"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <span>GAME</span>
                    )}
                </div>
            </div>
        </header>
    )
}

export default LiveHeader
