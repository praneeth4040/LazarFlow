import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Theme } from '../styles/theme';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const GlobalAlert = forwardRef((props, ref) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        buttons: [],
        type: 'info' // info, success, warning, error
    });

    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
        alert: (title, message, buttons = [], options = {}) => {
            
            // Determine type based on title for a better default icon
            let type = 'info';
            const lowerTitle = (title || '').toLowerCase();
            if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('denied')) type = 'error';
            else if (lowerTitle.includes('success')) type = 'success';
            else if (lowerTitle.includes('warning') || lowerTitle.includes('notice')) type = 'warning';

            setConfig({
                title,
                message,
                buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => {} }],
                type
            });
            setVisible(true);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }));

    const hideAlert = (onPress) => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            })
        ]).start(() => {
            setVisible(false);
            if (onPress) onPress();
        });
    };

    if (!visible) return null;

    const getIcon = () => {
        switch (config.type) {
            case 'success': return <CheckCircle size={32} color={Theme.colors.success || '#10B981'} />;
            case 'error': return <XCircle size={32} color={Theme.colors.danger} />;
            case 'warning': return <AlertTriangle size={32} color={Theme.colors.warning || '#F59E0B'} />;
            default: return <Info size={32} color={Theme.colors.accent} />;
        }
    };

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.alertBox,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <View style={styles.iconContainer}>
                        {getIcon()}
                    </View>
                    
                    <Text style={styles.title}>{config.title}</Text>
                    {!!config.message && <Text style={styles.message}>{config.message}</Text>}
                    
                    <View style={[styles.buttonContainer, config.buttons.length > 2 && styles.buttonContainerVertical]}>
                        {config.buttons.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';
                            
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        config.buttons.length > 2 && styles.buttonVertical,
                                        config.buttons.length === 2 && index === 0 && styles.buttonSecondary,
                                        isCancel && styles.buttonCancel,
                                        isDestructive && styles.buttonDestructive
                                    ]}
                                    onPress={() => hideAlert(btn.onPress)}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        config.buttons.length === 2 && index === 0 && styles.buttonTextSecondary,
                                        isCancel && styles.buttonTextCancel,
                                        isDestructive && styles.buttonTextDestructive
                                    ]}>
                                        {btn.text || 'OK'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertBox: {
        width: width - 60,
        backgroundColor: Theme.colors.primary,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 12,
    },
    buttonContainerVertical: {
        flexDirection: 'column',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonVertical: {
        width: '100%',
    },
    buttonSecondary: {
        backgroundColor: Theme.colors.secondary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    buttonCancel: {
        backgroundColor: 'transparent',
    },
    buttonDestructive: {
        backgroundColor: Theme.colors.danger + '20', // Light red background
        borderWidth: 1,
        borderColor: Theme.colors.danger,
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
    },
    buttonTextSecondary: {
        color: Theme.colors.textPrimary,
    },
    buttonTextCancel: {
        color: Theme.colors.textSecondary,
    },
    buttonTextDestructive: {
        color: Theme.colors.danger,
    }
});

export default GlobalAlert;
