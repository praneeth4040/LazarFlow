import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingSlide } from '../types';
import { Theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface OnboardingSlideItemProps {
  item: OnboardingSlide;
}

export const OnboardingSlideItem: React.FC<OnboardingSlideItemProps> = ({ item }) => {
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

const styles = StyleSheet.create({
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
});
