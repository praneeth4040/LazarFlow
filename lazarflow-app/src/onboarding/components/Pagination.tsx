import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Theme } from '../../styles/theme';

interface PaginationProps {
  slides: any[];
  currentIndex: number;
}

export const Pagination: React.FC<PaginationProps> = ({ slides, currentIndex }) => {
  return (
    <View style={styles.indicatorContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            { backgroundColor: currentIndex === index ? Theme.colors.accent : Theme.colors.border }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
});
