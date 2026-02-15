import { Platform } from 'react-native';

export const Theme = {
    colors: {
        primary: '#FFFFFF',
        secondary: '#F8F9FA',
        textPrimary: '#202124',
        textSecondary: '#5F6368',
        accent: '#1A73E8',
        accentHover: '#1557B0',
        border: '#DADCE0',
        danger: '#EA4335',
        success: '#34A853',
        warning: '#FBBC04',
        card: '#FFFFFF',
        shadow: 'rgba(60, 64, 67, 0.3)',
    },
    fonts: {
        outfit: {
            light: 'Outfit_300Light',
            regular: 'Outfit_400Regular',
            medium: 'Outfit_500Medium',
            semibold: 'Outfit_600SemiBold',
            bold: 'Outfit_700Bold',
        },
        inter: {
            regular: 'Inter_400Regular',
            medium: 'Inter_500Medium',
            semibold: 'Inter_600SemiBold',
            bold: 'Inter_700Bold',
            extrabold: 'Inter_800ExtraBold',
        },
        mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    radius: {
        md: 8,
        lg: 16,
        full: 9999,
    },
};
