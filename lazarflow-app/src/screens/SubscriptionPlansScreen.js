import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Check, Sparkles, ArrowLeft, Award, Crown, Zap, ShieldCheck } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabaseClient';

const SubscriptionPlansScreen = ({ navigation }) => {
    const { tier, lobbiesCreated, limits } = useSubscription();

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: '₹0',
            period: 'Forever',
            icon: <Zap size={24} color={Theme.colors.textSecondary} />,
            features: [
                '2 AI Lobbies per month',
                '1 Active Layout slot',
                'Standard support',
                'Basic designs'
            ],
            color: Theme.colors.textSecondary,
            isCurrent: tier === 'free'
        },
        {
            id: 'ranked',
            name: 'Ranked',
            price: '₹99',
            period: 'Monthly',
            icon: <ShieldCheck size={24} color="#94a3b8" />,
            features: [
                '60 AI Lobbies per month',
                '3 Active Layout slots',
                'Custom Socials',
                'Ad-free experience',
                'Priority processing'
            ],
            color: '#94a3b8',
            isCurrent: tier === 'ranked'
        },
        {
            id: 'competitive',
            name: 'Competitive',
            price: '₹249',
            period: 'Monthly',
            icon: <Award size={24} color="#f59e0b" />,
            features: [
                '100 AI Lobbies per month',
                '5 Active Layout slots',
                'Custom Socials',
                'Premium Designs',
                'Priority support'
            ],
            color: '#f59e0b',
            isCurrent: tier === 'competitive'
        },
        {
            id: 'premier',
            name: 'Premier',
            price: '₹499',
            period: 'Monthly',
            icon: <Crown size={24} color="#8b5cf6" />,
            features: [
                '150 AI Lobbies per month',
                '5 Active Layout slots',
                'All Custom Socials',
                'Exclusive Layouts',
                '24/7 Support'
            ],
            color: '#8b5cf6',
            isCurrent: tier === 'premier'
        },
        {
            id: 'developer',
            name: 'Developer',
            price: 'Custom',
            period: 'Yearly',
            icon: <Sparkles size={24} color="#38bdf8" />,
            features: [
                'Unlimited AI Lobbies',
                'Unlimited Layout slots',
                'Full API access',
                'Custom Integrations',
                'Direct Developer Support'
            ],
            color: '#38bdf8',
            isCurrent: tier === 'developer'
        }
    ];

    const handleClaim = async (plan) => {
        if (plan.isCurrent) {
            Alert.alert('Current Plan', `You are already subscribed to the ${plan.name} plan.`);
            return;
        }

        Alert.alert(
            'Upgrade Plan',
            `Would you like to upgrade to the ${plan.name} plan for ${plan.price}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Upgrade Now', 
                    onPress: async () => {
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('User not found');

                            const { error } = await supabase
                                .from('profiles')
                                .update({ subscription_tier: plan.id })
                                .eq('id', user.id);

                            if (error) throw error;

                            Alert.alert('Success', `You have successfully upgraded to the ${plan.name} plan!`);
                            navigation.goBack();
                        } catch (error) {
                            console.error('Error upgrading plan:', error);
                            Alert.alert('Error', 'Failed to upgrade plan. Please try again later.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Choose Your Plan</Text>
                    <Text style={styles.subtitle}>Unlock more features and increase your limits</Text>
                </View>

                {plans.map((plan) => (
                    <View key={plan.id} style={[styles.planCard, plan.isCurrent && { borderColor: plan.color, borderWidth: 2 }]}>
                        <View style={styles.planHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: plan.color + '20' }]}>
                                {plan.icon}
                            </View>
                            <View style={styles.planInfo}>
                                <Text style={styles.planName}>{plan.name}</Text>
                                <Text style={styles.planPrice}>{plan.price}<Text style={styles.planPeriod}> / {plan.period}</Text></Text>
                            </View>
                            {plan.isCurrent && (
                                <View style={[styles.currentBadge, { backgroundColor: plan.color }]}>
                                    <Text style={styles.currentBadgeText}>Current</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.featuresList}>
                            {plan.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <Check size={16} color={Theme.colors.accent} style={styles.featureIcon} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.claimBtn,
                                { backgroundColor: plan.isCurrent ? Theme.colors.secondary : plan.color },
                                plan.isCurrent && { borderWidth: 1, borderColor: plan.color }
                            ]}
                            onPress={() => handleClaim(plan)}
                            disabled={plan.isCurrent}
                        >
                            <Text style={[
                                styles.claimBtnText,
                                { color: plan.isCurrent ? plan.color : '#fff' }
                            ]}>
                                {plan.isCurrent ? 'Current Plan' : 'Claim Now'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Theme.colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
    },
    planCard: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.text,
    },
    planPrice: {
        fontSize: 18,
        fontWeight: '600',
        color: Theme.colors.accent,
    },
    planPeriod: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        fontWeight: 'normal',
    },
    currentBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    currentBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    featuresList: {
        marginBottom: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    featureIcon: {
        marginRight: 10,
    },
    featureText: {
        fontSize: 15,
        color: Theme.colors.textSecondary,
    },
    claimBtn: {
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    claimBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SubscriptionPlansScreen;
