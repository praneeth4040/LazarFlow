import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import './WhatsNewModal.css';

const WhatsNewModal = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const features = [
        {
            title: "Improved Extraction Process",
            description: "Meet LexiView, our new powerful OCR engine. It reads scoreboard screenshots with higher accuracy and speed, reducing manual corrections.",
            tag: "NEW ENGINE",
            image: "/WhatsNew.jpeg" // Placeholder as requested
        },
        {
            title: "Custom Points Table Layouts",
            description: "You now have full control! Design your own points table layouts, customize colors, fonts, and styles to match your brand directly from the dashboard.",
            tag: "PERSONALIZATION",
            image: "/WhatsNew.jpeg" // Placeholder as requested
        }
    ];

    const handleNext = () => {
        if (currentStep < features.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
            // Reset step for next time (optional, depending on desired behavior)
            setTimeout(() => setCurrentStep(0), 300);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const currentFeature = features[currentStep];

    return (
        <div className="whats-new-overlay" onClick={onClose}>
            <div className="whats-new-card" onClick={(e) => e.stopPropagation()}>
                <div className="whats-new-image-container">
                    <img
                        src={currentFeature.image}
                        alt={currentFeature.title}
                        className="whats-new-image"
                        key={currentStep} // Force re-render for animation
                    />
                </div>

                <div className="whats-new-content">
                    <span className="whats-new-tag">{currentFeature.tag}</span>
                    <h2 className="whats-new-title">{currentFeature.title}</h2>
                    <p className="whats-new-description">{currentFeature.description}</p>
                </div>

                <div className="whats-new-footer">
                    <div className="whats-new-pagination">
                        {features.map((_, idx) => (
                            <div
                                key={idx}
                                className={`pagination-dot ${currentStep === idx ? 'active' : ''}`}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {currentStep > 0 && (
                            <button className="whats-new-btn-secondary" onClick={handleBack}>
                                Back
                            </button>
                        )}
                        <button className="whats-new-btn-primary" onClick={handleNext}>
                            {currentStep === features.length - 1 ? "Let's Go!" : 'Next'}
                            {currentStep === features.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsNewModal;
