import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { X, Sparkles } from 'lucide-react-native';

interface ProcessingOverlayProps {
    visible: boolean;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ visible }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const innerRotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                ),
                Animated.loop(
                    Animated.timing(innerRotateAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    })
                )
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const innerRotation = innerRotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg']
    });

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlayContainer}>
                <Animated.View style={[styles.overlayBackdrop, { opacity: fadeAnim }]} />
                <Animated.View style={[styles.overlayContentNew, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <View style={styles.loaderHeader}>
                        <X size={20} color="#cbd5e1" style={{ opacity: 0 }} />
                        <Text style={styles.loaderBrand}>LexiView AI</Text>
                        <X size={20} color="#cbd5e1" />
                    </View>

                    <View style={styles.aiAnimationContainer}>
                        <Animated.View style={[styles.outerRing, { transform: [{ rotate: rotation }] }]}>
                            <View style={styles.ringDot} />
                        </Animated.View>
                        <Animated.View style={[styles.middleRing, { transform: [{ rotate: innerRotation }] }]} />
                        <View style={styles.innerCircleBlue}>
                            <Sparkles size={32} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.aiAtWorkTitle}>AI at work...</Text>
                    <Text style={styles.aiAtWorkSubtitle}>
                        Processing your request and analyzing data. This typically takes less than a minute.
                    </Text>

                    <View style={styles.didYouKnowBox}>
                        <Text style={styles.didYouKnowLabel}>DID YOU KNOW?</Text>
                        <Text style={styles.didYouKnowText}>
                            "LazarFlow automatically syncs your tournament results to the cloud, so you can access them from any device at any time."
                        </Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
    },
    overlayContentNew: {
        width: '85%',
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    loaderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 32,
    },
    loaderBrand: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    aiAnimationContainer: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    outerRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringDot: {
        position: 'absolute',
        top: -4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    middleRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(59, 130, 246, 0.4)',
    },
    innerCircleBlue: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    aiAtWorkTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 12,
    },
    aiAtWorkSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    didYouKnowBox: {
        width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 16,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
    },
    didYouKnowLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#3b82f6',
        letterSpacing: 1,
        marginBottom: 6,
    },
    didYouKnowText: {
        fontSize: 12,
        color: '#cbd5e1',
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
