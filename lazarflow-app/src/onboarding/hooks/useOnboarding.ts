import { useState, useRef } from 'react';
import { FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const { width } = Dimensions.get('window');

export const useOnboarding = (slidesCount: number, onComplete: () => void) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slidesCount - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return {
    currentIndex,
    flatListRef,
    handleNext,
    handleSkip,
    onMomentumScrollEnd,
    isLastSlide: currentIndex === slidesCount - 1,
  };
};
