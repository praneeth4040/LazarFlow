import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ServerCrash, FileQuestion, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { Theme } from '../../styles/theme';

const ERROR_CONFIG: Record<string, any> = {
    '404': {
        icon: FileQuestion,
        title: 'Page Not Found',
        message: "The page you're looking for doesn't seem to exist.",
        color: Theme.colors.warning,
    },
    '500': {
        icon: ServerCrash,
        title: 'Server Error',
        message: 'There was an issue with our server. Please try again later.',
        color: Theme.colors.danger,
    },
    default: {
        icon: AlertTriangle,
        title: 'An Error Occurred',
        message: 'Something went wrong. We have been notified and are looking into it.',
        color: Theme.colors.accent,
    },
};

interface GenericErrorPageProps {
    navigation: any;
    route: any;
}

export const GenericErrorPage: React.FC<GenericErrorPageProps> = ({ navigation, route }) => {
    // Default to a generic error if no params are passed
    const { errorCode = 'default', message } = route.params || {};

    const config = ERROR_CONFIG[errorCode] || ERROR_CONFIG.default;
    const displayMessage = message || config.message;
    const IconComponent = config.icon;

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
                    <IconComponent size={64} color={config.color} />
                </View>
                <Text style={styles.title}>{config.title}</Text>
                <Text style={styles.message}>{displayMessage}</Text>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim }}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.replace('Dashboard')}
                >
                    <ArrowLeft size={20} color="#fff" />
                    <Text style={styles.buttonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.secondary, justifyContent: 'center', alignItems: 'center', padding: 24 },
    content: { alignItems: 'center', marginBottom: 40 },
    iconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, textAlign: 'center', marginBottom: 12 },
    message: { fontSize: 16, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: '90%' },
    button: { backgroundColor: Theme.colors.accent, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12, shadowColor: Theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold }
});
