import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Google "G" logo rendered as SVG — no network, no file dependency.
 * Uses official Google brand colors.
 */
const GoogleLogo: React.FC<{ size?: number }> = ({ size = 20 }) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 48 48" width={size} height={size}>
        {/* Blue */}
        <Path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        {/* Green */}
        <Path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.32-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        {/* Yellow */}
        <Path
          fill="#FBBC05"
          d="M11.68 28.18A13.8 13.8 0 0 1 10.8 24c0-1.45.25-2.86.68-4.18v-5.7H4.34A23.93 23.93 0 0 0 .08 24c0 3.86.92 7.51 2.56 10.74l7.04-5.47z"
        />
        {/* Red */}
        <Path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.19 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.34 5.7c1.74-5.2 6.59-9.07 12.32-9.07z"
        />
      </Svg>
    </View>
  );
};

export default GoogleLogo;
