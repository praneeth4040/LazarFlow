import React, { useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Maximize2 } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';

interface VerificationImageSliderProps {
    urls?: string[];
    onViewVerification?: (url: string) => void;
}

export const VerificationImageSlider: React.FC<VerificationImageSliderProps> = ({ urls, onViewVerification }) => {
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [activeIndex, setActiveIndex] = useState<number>(0);

    if (!urls || urls.length === 0) return null;

    if (urls.length === 1) {
        return (
            <TouchableOpacity 
                style={styles.verificationImageContainer}
                onPress={() => onViewVerification && onViewVerification(urls[0])}
                activeOpacity={0.9}
            >
                <Image 
                    source={{ uri: urls[0] }} 
                    style={styles.verificationImage}
                    resizeMode="cover"
                />
                <View style={localStyles.maximizeBadge}>
                    <Maximize2 size={10} color="#fff" />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View 
            style={{ marginBottom: 14, width: '100%' }}
            onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setContainerWidth(w);
            }}
        >
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                    if (containerWidth > 0) {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
                        if (idx !== activeIndex) setActiveIndex(idx);
                    }
                }}
                scrollEventThrottle={16}
                style={{ borderRadius: 12, overflow: 'hidden' }}
            >
                {urls.map((url, uIdx) => (
                    <TouchableOpacity 
                        key={uIdx}
                        style={[
                            styles.verificationImageContainer, 
                            { 
                                width: containerWidth > 0 ? containerWidth : 280, 
                                marginBottom: 0, 
                                borderRadius: 12 
                            }
                        ]}
                        onPress={() => onViewVerification && onViewVerification(url)}
                        activeOpacity={0.9}
                    >
                        <Image 
                            source={{ uri: url }} 
                            style={styles.verificationImage}
                            resizeMode="cover"
                        />
                        <View style={localStyles.maximizeBadge}>
                            <Maximize2 size={10} color="#fff" />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Carousel Pagination Dots */}
            <View style={localStyles.paginationContainer}>
                {urls.map((_, dotIdx) => (
                    <View 
                        key={dotIdx}
                        style={[
                            localStyles.dot,
                            dotIdx === activeIndex ? localStyles.activeDot : localStyles.inactiveDot
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const localStyles = StyleSheet.create({
    maximizeBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginTop: 6,
    },
    dot: {
        height: 5,
        borderRadius: 3,
    },
    activeDot: {
        width: 14,
        backgroundColor: Theme.colors.accent,
    },
    inactiveDot: {
        width: 5,
        backgroundColor: '#cbd5e1',
    },
});

export default VerificationImageSlider;
