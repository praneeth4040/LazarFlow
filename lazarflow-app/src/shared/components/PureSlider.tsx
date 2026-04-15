/**
 * PureSlider.tsx
 *
 * 100% pure JavaScript slider — no native modules, safe for OTA updates.
 * API is a drop-in match for @react-native-community/slider.
 *
 * Uses PanResponder + View layout — zero external dependencies.
 */
import React, { useRef, useCallback } from 'react';
import {
    View, PanResponder, StyleSheet, ViewStyle, LayoutChangeEvent,
} from 'react-native';

interface Props {
    value?:                 number;
    minimumValue?:          number;
    maximumValue?:          number;
    step?:                  number;
    onValueChange?:         (value: number) => void;
    onSlidingComplete?:     (value: number) => void;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?:        string;
    style?:                 ViewStyle;
    disabled?:              boolean;
}

const THUMB_SIZE = 22;
const TRACK_HEIGHT = 4;

export const PureSlider: React.FC<Props> = ({
    value            = 0,
    minimumValue     = 0,
    maximumValue     = 1,
    step             = 0,
    onValueChange,
    onSlidingComplete,
    minimumTrackTintColor = '#1A73E8',
    maximumTrackTintColor = '#e2e8f0',
    thumbTintColor        = '#1A73E8',
    style,
    disabled = false,
}) => {
    const trackWidth = useRef(0);
    const currentValue = useRef(value);

    // Keep currentValue in sync with prop (controlled component)
    currentValue.current = value;

    const clamp = (v: number, lo: number, hi: number) =>
        Math.max(lo, Math.min(hi, v));

    const pixelToValue = useCallback((px: number): number => {
        if (trackWidth.current === 0) return minimumValue;
        const ratio = clamp(px / trackWidth.current, 0, 1);
        const raw = minimumValue + ratio * (maximumValue - minimumValue);
        if (step > 0) {
            return clamp(
                Math.round((raw - minimumValue) / step) * step + minimumValue,
                minimumValue,
                maximumValue,
            );
        }
        return clamp(raw, minimumValue, maximumValue);
    }, [minimumValue, maximumValue, step]);

    const valueToRatio = () => {
        const range = maximumValue - minimumValue;
        return range === 0 ? 0 : (value - minimumValue) / range;
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disabled,
            onMoveShouldSetPanResponder:  () => !disabled,
            onPanResponderGrant: (e) => {
                const { locationX } = e.nativeEvent;
                const newVal = pixelToValue(locationX);
                onValueChange?.(newVal);
            },
            onPanResponderMove: (e) => {
                const { locationX } = e.nativeEvent;
                // locationX is relative to the View receiving the responder
                const newVal = pixelToValue(clamp(locationX, 0, trackWidth.current));
                if (newVal !== currentValue.current) {
                    onValueChange?.(newVal);
                }
            },
            onPanResponderRelease: (e) => {
                const { locationX } = e.nativeEvent;
                const newVal = pixelToValue(clamp(locationX, 0, trackWidth.current));
                onSlidingComplete?.(newVal);
            },
        })
    ).current;

    const onLayout = (e: LayoutChangeEvent) => {
        trackWidth.current = e.nativeEvent.layout.width;
    };

    const fillRatio = valueToRatio();

    return (
        <View
            style={[s.container, style]}
            onLayout={onLayout}
            {...panResponder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
        >
            {/* Track background */}
            <View style={[s.track, { backgroundColor: maximumTrackTintColor }]}>
                {/* Filled portion */}
                <View
                    style={[
                        s.fill,
                        {
                            width: `${fillRatio * 100}%`,
                            backgroundColor: minimumTrackTintColor,
                        },
                    ]}
                />
            </View>

            {/* Thumb */}
            <View
                style={[
                    s.thumb,
                    {
                        left: `${fillRatio * 100}%`,
                        backgroundColor: thumbTintColor,
                        // Offset by half thumb width so it sits centred on the position
                        marginLeft: -THUMB_SIZE / 2,
                    },
                ]}
            />
        </View>
    );
};

const s = StyleSheet.create({
    container: {
        height: 40,
        justifyContent: 'center',
        // Allow touch to register across the full height (thumb + track)
    },
    track: {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    fill: {
        height: '100%',
        borderRadius: TRACK_HEIGHT / 2,
    },
    thumb: {
        position: 'absolute',
        top: '50%',
        width:  THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        marginTop: -THUMB_SIZE / 2,
        // Subtle shadow so it looks lifted
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
