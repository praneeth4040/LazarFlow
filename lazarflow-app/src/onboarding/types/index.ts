import { LucideIcon } from 'lucide-react-native';

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  colors: [string, string];
}

export interface OnboardingState {
  currentIndex: number;
  isLastSlide: boolean;
}
