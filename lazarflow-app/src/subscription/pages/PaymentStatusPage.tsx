import React, { useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, BackHandler, Linking } from 'react-native';
import { CheckCircle, XCircle, Home, RefreshCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';

interface PaymentStatusPageProps {
    route: any;
    navigation: any;
}

export const PaymentStatusPage: React.FC<PaymentStatusPageProps> = ({ route, navigation }) => {
    const { status, orderId, message, planName, showWhatsApp } = route.params || {};
    const isSuccess = status === 'success';
    const isCancelled = status === 'cancelled';
    const { refreshUser } = useContext(UserContext);

    // Refresh user data on success
    useEffect(() => {
        if (isSuccess && refreshUser) {
            refreshUser();
        }
    }, [isSuccess]);

    // Prevent going back to the payment process
    useEffect(() => {
        const backAction = () => {
            navigation.navigate('Dashboard');
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [navigation]);

    // Format clean readable error text
    const displayMessage = React.useMemo(() => {
        if (isSuccess) {
            return `Congratulations! You have successfully subscribed to the ${planName || 'Premium'} plan.`;
        }
        if (isCancelled) {
            return message || 'Payment was cancelled. No charges were made to your account.';
        }
        if (!message) {
            return 'Something went wrong while processing your payment. Please try again or reach out to support if amount was deducted.';
        }

        // Clean out any raw json if still present
        let clean = typeof message === 'string' ? message : JSON.stringify(message);
        if (clean.startsWith('{') && clean.endsWith('}')) {
            try {
                const parsed = JSON.parse(clean);
                clean = parsed.error?.description || parsed.description || parsed.message || clean;
            } catch (_) {}
        }
        return clean;
    }, [isSuccess, isCancelled, message, planName]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {isSuccess ? (
                        <View style={[styles.iconCircle, { backgroundColor: Theme.colors.success + '15' }]}>
                            <CheckCircle size={80} color={Theme.colors.success} strokeWidth={1.5} />
                        </View>
                    ) : isCancelled ? (
                        <View style={[styles.iconCircle, { backgroundColor: '#F59E0B18' }]}>
                            <XCircle size={80} color="#F59E0B" strokeWidth={1.5} />
                        </View>
                    ) : (
                        <View style={[styles.iconCircle, { backgroundColor: Theme.colors.danger + '15' }]}>
                            <XCircle size={80} color={Theme.colors.danger} strokeWidth={1.5} />
                        </View>
                    )}
                </View>

                <Text style={styles.title}>
                    {isSuccess ? 'Payment Successful!' : isCancelled ? 'Payment Cancelled' : 'Payment Failed'}
                </Text>

                <View style={!isSuccess ? styles.errorCard : null}>
                    <Text style={[styles.description, !isSuccess && styles.errorDescription]}>
                        {displayMessage}
                    </Text>
                </View>

                {orderId && (
                    <View style={styles.orderInfo}>
                        <Text style={styles.orderLabel}>Order ID</Text>
                        <Text style={styles.orderValue}>{orderId}</Text>
                    </View>
                )}

                <View style={styles.buttonContainer}>
                    {isSuccess ? (
                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('Dashboard')}
                        >
                            <LinearGradient
                                colors={[Theme.colors.accent, Theme.colors.accent + 'CC']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradient}
                            >
                                <Home size={20} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity 
                                style={styles.primaryButton}
                                onPress={() => navigation.navigate('SubscriptionPlans')}
                            >
                                <LinearGradient
                                    colors={[Theme.colors.accent, Theme.colors.accent + 'CC']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradient}
                                >
                                    <RefreshCcw size={20} color="#fff" style={styles.buttonIcon} />
                                    <Text style={styles.primaryButtonText}>Try Again</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {showWhatsApp && (
                                <TouchableOpacity 
                                    style={[styles.secondaryButton, { borderColor: '#25D366' }]}
                                    onPress={() => Linking.openURL('https://wa.me/+919121314837')}
                                >
                                    <Text style={[styles.secondaryButtonText, { color: '#25D366' }]}>Contact Support (WhatsApp)</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={styles.secondaryButton}
                                onPress={() => navigation.navigate('Dashboard')}
                            >
                                <Text style={styles.secondaryButtonText}>Back to Home</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.secondary },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    iconContainer: { marginBottom: 30 },
    iconCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 15, textAlign: 'center' },
    description: { fontSize: 16, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
    errorCard: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 30,
        width: '100%',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    errorDescription: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.medium,
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 0,
    },
    orderInfo: { backgroundColor: Theme.colors.primary, padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: Theme.colors.border },
    orderLabel: { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: Theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
    orderValue: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    buttonContainer: { width: '100%', gap: 15 },
    primaryButton: { height: 56, borderRadius: 16, overflow: 'hidden' },
    gradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    buttonIcon: { marginRight: 10 },
    primaryButtonText: { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: '#fff' },
    secondaryButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.primary },
    secondaryButtonText: { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary }
});
