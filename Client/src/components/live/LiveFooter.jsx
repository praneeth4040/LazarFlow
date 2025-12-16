import React from 'react'
import { Instagram, Twitter, Youtube, Twitch, Facebook, Globe, MessageSquare, Link as LinkIcon } from 'lucide-react'

const SOCIAL_ICONS = {
    instagram: Instagram,
    twitter: Twitter,
    youtube: Youtube,
    twitch: Twitch,
    facebook: Facebook,
    discord: MessageSquare,
    website: Globe
}

const LiveFooter = ({ themeSource }) => {
    return (
        <footer className="live-footer">
            <div className="footer-left">
                <span>{themeSource?.footerLeft || '@LazarFlow'}</span>
            </div>
            <div className="footer-center">
                <span>{themeSource?.footerCenter || 'POWERED BY LAZARFLOW'}</span>
            </div>
            <div className="footer-right footer-socials">
                {(themeSource?.footerSocials || []).map((item, idx) => {
                    const IconComp = SOCIAL_ICONS[item.type] || LinkIcon;
                    const href = item.url || '#';
                    return (
                        <a
                            key={`${item.type}-${idx}`}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={item.type}
                            className="footer-social-btn"
                        >
                            <IconComp size={18} />
                        </a>
                    );
                })}
                {(themeSource?.footerSocials || []).length === 0 && (
                    <span>{themeSource?.footerRight || 'lazarflow.com'}</span>
                )}
            </div>
        </footer>
    )
}

export default LiveFooter
