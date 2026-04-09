import { Trophy, Zap, Star, Share2 } from 'lucide-react-native';
import { OnboardingSlide } from '../types';

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
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
