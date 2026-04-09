import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../styles/theme';
import { ONBOARDING_SLIDES } from '../utils/constants';
import { useOnboarding } from '../hooks/useOnboarding';
import { OnboardingSlideItem } from '../components/OnboardingSlideItem';
import { Pagination } from '../components/Pagination';

const { width } = Dimensions.get('window');

interface OnboardingPageProps {
  navigation: any;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ navigation }) => {
  const { 
    currentIndex, 
    flatListRef, 
    handleNext, 
    handleSkip, 
    onMomentumScrollEnd, 
    isLastSlide 
  } = useOnboarding(ONBOARDING_SLIDES.length, () => navigation.replace('SignUp'));

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }} />

      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>LazarFlow</Text>
        </View>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={({ item }) => <OnboardingSlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        <Pagination slides={ONBOARDING_SLIDES} currentIndex={currentIndex} />

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <LinearGradient
            colors={['#1E3A8A', '#3B82F6']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.nextBtnText}>
              {isLastSlide ? 'Get Started' : 'Next'}
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
  footer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 60,
    alignItems: 'center',
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
