import { useEffect, useMemo } from 'react'

export const useTournamentTheme = (tournament, previewConfig) => {

    // 1. Construct Theme Object
    const themeSource = useMemo(() => {
        const rawTheme = tournament?.theme_config;
        let dbTheme = rawTheme;
        if (typeof rawTheme === 'string') {
            try {
                dbTheme = JSON.parse(rawTheme);
            } catch {
                dbTheme = {};
            }
        }
        return previewConfig?.theme || dbTheme || {};
    }, [tournament?.theme_config, previewConfig?.theme]);

    // 2. Load Google Fonts
    useEffect(() => {
        const fontFamily = themeSource.fontFamily
        if (fontFamily) {
            const fontName = fontFamily.split(',')[0].replace(/['"]/g, '')
            const link = document.createElement('link')
            link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap`
            link.rel = 'stylesheet'
            document.head.appendChild(link)
            return () => {
                document.head.removeChild(link)
            }
        }
    }, [themeSource.fontFamily])

    // 3. Generate CSS Variables
    const customStyles = useMemo(() => {
        const styles = themeSource ? {
            '--live-bg-color': themeSource.backgroundColor || '#ffffff',
            '--live-bg-image': themeSource.backgroundImage ? `url("${themeSource.backgroundImage}")` : 'none',
            '--live-font-family': themeSource.fontFamily || 'Outfit, sans-serif',
            '--live-border-color': themeSource.borderColor || '#e2e8f0',
            '--live-table-bg': themeSource.tableBackgroundColor || 'transparent',
            '--live-table-cell-skew': typeof themeSource.tableCellSkew === 'number' ? `${themeSource.tableCellSkew}deg` : '0deg',
            '--live-cell-gap': typeof themeSource.cellGap === 'number' ? `${themeSource.cellGap}px` : '4px',
            '--live-cell-cut-size': typeof themeSource.cellCutSize === 'number' ? `${themeSource.cellCutSize}px` : '8px',
            '--live-body-text-color': '#1a202c',

            // Header
            '--live-header-bg': themeSource.headerBackgroundColor || 'transparent',
            '--live-header-text-color': themeSource.headerTextColor || '#ffffff',
            '--live-header-bg-image': themeSource.headerBackgroundImage ? `url("${themeSource.headerBackgroundImage}")` : 'none',
            '--live-pt-header-bg': (themeSource.tableStyles?.header?.backgroundColor) || 'transparent',
            '--live-pt-header-text-color': (themeSource.tableStyles?.header?.textColor) || '#1a202c',

            // Footer
            '--live-footer-bg-color': themeSource.footerBackgroundColor || '#000000',
            '--live-footer-text-color': themeSource.footerTextColor || '#ffffff',
            '--live-footer-bg-image': themeSource.footerBackgroundImage ? `url("${themeSource.footerBackgroundImage}")` : 'none',

            // Column Styles
            '--live-col-rank-bg': (themeSource.tableStyles?.rank?.backgroundColor) || 'transparent',
            '--live-col-rank-text': (themeSource.tableStyles?.rank?.textColor) || 'inherit',
            '--live-col-team-bg': (themeSource.tableStyles?.team?.backgroundColor) || 'transparent',
            '--live-col-team-text': (themeSource.tableStyles?.team?.textColor) || 'inherit',
            '--live-col-wwcd-bg': (themeSource.tableStyles?.wwcd?.backgroundColor) || 'transparent',
            '--live-col-wwcd-text': (themeSource.tableStyles?.wwcd?.textColor) || 'inherit',
            '--live-col-place-bg': (themeSource.tableStyles?.place?.backgroundColor) || 'transparent',
            '--live-col-place-text': (themeSource.tableStyles?.place?.textColor) || 'inherit',
            '--live-col-kills-bg': (themeSource.tableStyles?.kills?.backgroundColor) || 'transparent',
            '--live-col-kills-text': (themeSource.tableStyles?.kills?.textColor) || 'inherit',
            '--live-col-total-bg': (themeSource.tableStyles?.total?.backgroundColor) || 'transparent',
            '--live-col-total-text': (themeSource.tableStyles?.total?.textColor) || 'inherit',
        } : {}

        if (Object.keys(styles).length > 0) {
            const shape = themeSource.cellShape || 'square'
            let radius = '0px'
            let clip = 'none'
            const cut = styles['--live-cell-cut-size'] || '8px'
            if (shape === 'rounded') {
                radius = '6px'
            } else if (shape === 'pill') {
                radius = '9999px'
            } else if (shape === 'cut') {
                clip = `polygon(0 ${cut}, ${cut} 0, calc(100% - ${cut}) 0, 100% ${cut}, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, ${cut} 100%, 0 calc(100% - ${cut}))`
            }
            styles['--live-cell-radius'] = radius
            styles['--live-cell-clip'] = clip
        }

        return styles
    }, [themeSource])

    return { themeSource, customStyles }
}
