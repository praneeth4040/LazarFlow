import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, BackHandler } from 'react-native';
import { CheckCircle, XCircle, ArrowLeft, Home, RefreshCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../styles/theme';

const PaymentStatusScreen = ({ route, navigation }) => {
    const { status, orderId, message, planName } = route.params || {};
    const isSuccess = status === 'success';

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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {isSuccess ? (
                        <View style={[styles.iconCircle, { backgroundColor: Theme.colors.success + '15' }]}>
                            <CheckCircle size={80} color={Theme.colors.success} strokeWidth={1.5} />
                        </View>
                    ) : (
                        <View style={[styles.iconCircle, { backgroundColor: Theme.colors.danger + '15' }]}>
                            <XCircle size={80} color={Theme.colors.danger} strokeWidth={1.5} />
                        </View>
                    )}
                </View>

                <Text style={styles.title}>
                    {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
                </Text>

                <Text style={styles.description}>
                    {isSuccess 
                        ? `Congratulations! You have successfully subscribed to the ${planName || 'Premium'} plan.`
                        : message || 'Something went wrong with your transaction. Please try again or contact support if the issue persists.'
                    }
                </Text>

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
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    iconContainer: {
        marginBottom: 30,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 15,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    orderInfo: {
        backgroundColor: Theme.colors.primary,
        padding: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    orderLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.medium,
        color: Theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
    },
    orderValue: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
    },
    primaryButton: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonIcon: {
        marginRight: 10,
    },
    primaryButtonText: {
        fontSize: 17,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
    },
    secondaryButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        backgroundColor: Theme.colors.primary,
    },
    secondaryButtonText: {
        fontSize: 17,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
});

export default PaymentStatusScreen;
