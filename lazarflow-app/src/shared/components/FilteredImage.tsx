/**
 * FilteredImage.tsx
 *
 * Drop-in image component that applies live color adjustments via
 * SVG feColorMatrix — zero network, instant updates, capturable by view-shot.
 *
 * REQUIRES: react-native-svg  →  npm install react-native-svg
 * (native module — needs a new APK build before OTA)
 */
import React, { forwardRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Image as SvgImage, Defs, Filter, FeColorMatrix } from 'react-native-svg';
import { Adjustments, computeColorMatrix } from '../utils/colorMatrix';

interface Props {
    source:      { uri: string };
    style?:      ViewStyle;
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
    adjustments: Adjustments;
}

/**
 * Always renders via SVG so react-native-view-shot can reliably capture it
 * with the filter applied. Identity matrix = visually identical to a plain Image.
 */
export const FilteredImage = forwardRef<View, Props>(({
    source, style, resizeMode = 'contain', adjustments,
}, ref) => {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [loaded, setLoaded] = useState(false);

    const flat = StyleSheet.flatten(style) as any;
    const w = size.width  || (flat?.width  as number) || 300;
    const h = size.height || (flat?.height as number) || 400;

    const preserveAspect =
        resizeMode === 'cover'   ? 'xMidYMid slice' :
        resizeMode === 'stretch' ? 'none' :
        'xMidYMid meet'; // contain / center

    const matrix = computeColorMatrix(adjustments);

    return (
        <View
            ref={ref}
            style={[style, { overflow: 'hidden' }]}
            onLayout={e => setSize({
                width:  e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
            })}
        >
            {!loaded && (
                <ActivityIndicator
                    style={StyleSheet.absoluteFill}
                    size="small"
                    color="#94a3b8"
                />
            )}
            <Svg
                width={w}
                height={h}
                style={StyleSheet.absoluteFill}
            >
                <Defs>
                    <Filter id="colorAdjust">
                        <FeColorMatrix type="matrix" values={matrix} />
                    </Filter>
                </Defs>
                <SvgImage
                    href={source.uri}
                    width={w}
                    height={h}
                    preserveAspectRatio={preserveAspect}
                    filter="url(#colorAdjust)"
                    onLoad={() => setLoaded(true)}
                />
            </Svg>
        </View>
    );
});

FilteredImage.displayName = 'FilteredImage';
