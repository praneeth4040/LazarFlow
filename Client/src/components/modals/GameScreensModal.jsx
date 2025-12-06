import React, { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import './GameScreensModal.css'

function GameScreensModal({ isOpen, onClose, tournament, userEmail }) {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedImageIndex, setSelectedImageIndex] = useState(null)

    useEffect(() => {
        if (isOpen && tournament && userEmail) {
            fetchGameScreens()
        }
    }, [isOpen, tournament, userEmail])

    const sanitizeForPath = (str) => {
        if (!str) return 'unknown'
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
    }

    const fetchGameScreens = async () => {
        try {
            setLoading(true)
            setError(null)

            const userName = sanitizeForPath(userEmail)
            const sanitizedTournament = sanitizeForPath(tournament.name)
            const folderPath = `${userName}/${sanitizedTournament}`

            console.log(`📥 Fetching images from: ${folderPath}`)

            // List all files in the tournament folder
            const { data, error: listError } = await supabase.storage
                .from('gameResults')
                .list(folderPath)

            if (listError) {
                console.error('❌ Error listing images:', listError)
                throw listError
            }

            if (!data || data.length === 0) {
                console.log('📭 No images found')
                setImages([])
                setLoading(false)
                return
            }

            // Get public URLs for all images
            const imageUrls = data
                .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                .map(file => {
                    const filePath = `${folderPath}/${file.name}`
                    const { data: urlData } = supabase.storage
                        .from('gameResults')
                        .getPublicUrl(filePath)

                    return {
                        name: file.name,
                        url: urlData.publicUrl,
                        path: filePath
                    }
                })
                .sort((a, b) => {
                    // Sort by image number (e.g., image1.png, image2.png)
                    const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0')
                    const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0')
                    return aNum - bNum
                })

            console.log(`✅ Found ${imageUrls.length} images`)
            setImages(imageUrls)
        } catch (err) {
            console.error('❌ Error fetching game screens:', err)
            setError('Failed to load game screens')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async (imageUrl, imageName) => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = imageName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error downloading image:', err)
        }
    }

    const openLightbox = (index) => {
        setSelectedImageIndex(index)
    }

    const closeLightbox = () => {
        setSelectedImageIndex(null)
    }

    const navigateLightbox = (direction) => {
        if (selectedImageIndex === null) return

        if (direction === 'prev') {
            setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
        } else {
            setSelectedImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container game-screens-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2>Game Screens - {tournament?.name}</h2>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                                {images.length} image{images.length !== 1 ? 's' : ''} uploaded
                            </p>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-content">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading game screens...</p>
                            </div>
                        ) : error ? (
                            <div className="error-state">
                                <p>{error}</p>
                                <button onClick={fetchGameScreens} className="retry-btn">
                                    Retry
                                </button>
                            </div>
                        ) : images.length === 0 ? (
                            <div className="empty-state">
                                <ImageIcon size={48} />
                                <h3>No Game Screens</h3>
                                <p>No images have been uploaded for this tournament yet.</p>
                            </div>
                        ) : (
                            <div className="images-grid">
                                {images.map((image, index) => (
                                    <div key={index} className="image-card">
                                        <div className="image-wrapper" onClick={() => openLightbox(index)}>
                                            <img src={image.url} alt={image.name} loading="lazy" />
                                            <div className="image-overlay">
                                                <span>Click to view</span>
                                            </div>
                                        </div>
                                        <div className="image-footer">
                                            <span className="image-name">{image.name}</span>
                                            <button
                                                className="download-btn"
                                                onClick={() => handleDownload(image.url, image.name)}
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {selectedImageIndex !== null && (
                <div className="lightbox-overlay" onClick={closeLightbox}>
                    <button className="lightbox-close" onClick={closeLightbox}>
                        <X size={24} />
                    </button>
                    <button
                        className="lightbox-nav lightbox-prev"
                        onClick={(e) => {
                            e.stopPropagation()
                            navigateLightbox('prev')
                        }}
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button
                        className="lightbox-nav lightbox-next"
                        onClick={(e) => {
                            e.stopPropagation()
                            navigateLightbox('next')
                        }}
                    >
                        <ChevronRight size={32} />
                    </button>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <img src={images[selectedImageIndex].url} alt={images[selectedImageIndex].name} />
                        <div className="lightbox-info">
                            <span>{images[selectedImageIndex].name}</span>
                            <span>{selectedImageIndex + 1} / {images.length}</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default GameScreensModal
