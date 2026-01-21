import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Trophy, Zap, Star, ArrowRight, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../styles/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Professional Management',
        description: 'Level up your esports lobbies with professional-grade tools.',
        icon: Trophy,
        colors: ['#1E3A8A', '#3B82F6'],
    },
    {
        id: '2',
        title: 'LexiView AI',
        description: 'Instantly extract results from screenshots with 99.9% accuracy.',
        icon: Zap,
        colors: ['#4F46E5', '#818CF8'],
    },
    {
        id: '3',
        title: 'Premium Layouts',
        description: 'Beautiful, customizable themes to make your standings stand out.',
        icon: Star,
        colors: ['#065F46', '#10B981'],
    },
    {
        id: '4',
        title: 'Easy Sharing',
        description: 'Share live standings and MVPs with your community in seconds.',
        icon: Share2,
        colors: ['#7C3AED', '#A78BFA'],
    }
];

const OnboardingScreen = ({ navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            navigation.replace('SignUp');
        }
    };

    const handleSkip = () => {
        navigation.replace('SignUp');
    };

    const renderItem = ({ item }) => {
        const Icon = item.icon;
        return (
            <View style={styles.slide}>
                <LinearGradient
                    colors={item.colors}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Icon size={64} color="#fff" />
                </LinearGradient>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }} />

            <View style={styles.topBar}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>LazarFlow</Text>
                </View>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                keyExtractor={(item) => item.id}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                { backgroundColor: currentIndex === index ? Theme.colors.accent : Theme.colors.border }
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <LinearGradient
                        colors={['#1E3A8A', '#3B82F6']}
                        style={styles.btnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.nextBtnText}>
                            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <ArrowRight size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    skipText: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.semibold,
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        transform: [{ rotate: '15deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 40,
        paddingBottom: Platform.OS === 'ios' ? 40 : 60,
        alignItems: 'center',
    },
    indicatorContainer: {
        flexDirection: 'row',
        marginBottom: 30,
        gap: 8,
    },
    indicator: {
        height: 8,
        width: 8,
        borderRadius: 4,
    },
    nextBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    nextBtnText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
    },
});

export default OnboardingScreen;
