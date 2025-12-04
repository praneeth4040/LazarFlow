import { useEffect } from 'react'
import { SEO_CONFIG } from '../utils/seoConfig'

/**
 * SEO Component - Manages dynamic meta tags for each page
 * Usage: <SEO title="Page Title" description="Page description" keywords="keyword1, keyword2" />
 */
const SEO = ({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    structuredData
}) => {
    useEffect(() => {
        // Update document title
        if (title) {
            document.title = title
        }

        // Update or create meta tags
        const updateMetaTag = (property, content, isProperty = false) => {
            if (!content) return

            const attribute = isProperty ? 'property' : 'name'
            let element = document.querySelector(`meta[${attribute}="${property}"]`)

            if (!element) {
                element = document.createElement('meta')
                element.setAttribute(attribute, property)
                document.head.appendChild(element)
            }

            element.setAttribute('content', content)
        }

        // Update standard meta tags
        updateMetaTag('description', description)
        updateMetaTag('keywords', keywords)

        // Update Open Graph tags
        updateMetaTag('og:title', title || SEO_CONFIG.defaultTitle, true)
        updateMetaTag('og:description', description || SEO_CONFIG.defaultDescription, true)
        updateMetaTag('og:url', url || window.location.href, true)
        updateMetaTag('og:type', type, true)
        updateMetaTag('og:image', image || `${SEO_CONFIG.siteUrl}${SEO_CONFIG.socialImage}`, true)

        // Update Twitter Card tags
        updateMetaTag('twitter:title', title || SEO_CONFIG.defaultTitle)
        updateMetaTag('twitter:description', description || SEO_CONFIG.defaultDescription)
        updateMetaTag('twitter:image', image || `${SEO_CONFIG.siteUrl}${SEO_CONFIG.socialImage}`)
        updateMetaTag('twitter:url', url || window.location.href)

        // Update canonical URL
        let canonical = document.querySelector('link[rel="canonical"]')
        if (!canonical) {
            canonical = document.createElement('link')
            canonical.setAttribute('rel', 'canonical')
            document.head.appendChild(canonical)
        }
        canonical.setAttribute('href', url || window.location.href)

        // Add structured data if provided
        if (structuredData) {
            let script = document.querySelector('script[data-dynamic-schema]')
            if (!script) {
                script = document.createElement('script')
                script.setAttribute('type', 'application/ld+json')
                script.setAttribute('data-dynamic-schema', 'true')
                document.head.appendChild(script)
            }
            script.textContent = JSON.stringify(structuredData)
        }
    }, [title, description, keywords, image, url, type, structuredData])

    return null // This component doesn't render anything
}

export default SEO
