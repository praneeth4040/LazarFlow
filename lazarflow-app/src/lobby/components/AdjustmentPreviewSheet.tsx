/**
 * AdjustmentPreviewSheet.tsx
 *
 * Bottom sheet: live preview image (always visible) + collapsible
 * "Adjust Settings" accordion for the 5 sliders.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, ScrollView,
    TouchableOpacity, Image, ActivityIndicator,
    Animated, LayoutAnimation, Platform, UIManager, Dimensions,
} from 'react-native';
import { X, RotateCcw, Check, Sliders, ChevronDown } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { useRenderPreview, Adjustments } from '../hooks/useRenderPreview';
import { PureSlider } from '../../shared/components/PureSlider';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_H } = Dimensions.get('window');

// ── Slider config ──────────────────────────────────────────────────────────────

const SLIDERS: { key: keyof Adjustments; label: string; min: number; max: number; step: number }[] = [
    { key: 'contrast',   label: 'Contrast',   min: 0.5,  max: 2.0,  step: 0.05 },
    { key: 'saturation', label: 'Saturation', min: 0.0,  max: 2.0,  step: 0.05 },
    { key: 'brightness', label: 'Brightness', min: 0.5,  max: 2.0,  step: 0.05 },
    { key: 'sharpness',  label: 'Sharpness',  min: 0.0,  max: 2.0,  step: 0.05 },
    { key: 'hue',        label: 'Hue',        min: -180, max: 180,  step: 1    },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
    visible:   boolean;
    themeId:   string | null;
    onClose:   () => void;
    onConfirm: (adjustments: Adjustments) => void;
}

export const AdjustmentPreviewSheet: React.FC<Props> = ({
    visible, themeId, onClose, onConfirm,
}) => {
    const { imageUri, isLoading, adjustments, updateAdjustment, resetAdjustments, error } =
        useRenderPreview(themeId);

    const [accordionOpen, setAccordionOpen] = useState(false);

    // Slide-up animation
    const slideY   = useRef(new Animated.Value(SCREEN_H)).current;
    // Chevron rotation
    const chevronR = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(slideY, {
                toValue: SCREEN_H,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const toggleAccordion = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.timing(chevronR, {
            toValue: accordionOpen ? 0 : 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setAccordionOpen(o => !o);
    };

    const chevronRotation = chevronR.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // Check if any slider is non-default
    const hasCustomValues =
        adjustments.contrast   !== 1.0 ||
        adjustments.saturation !== 1.0 ||
        adjustments.brightness !== 1.0 ||
        adjustments.sharpness  !== 1.0 ||
        adjustments.hue        !== 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={s.overlay}>
                {/* Dismiss area */}
                <TouchableOpacity style={s.dismiss} activeOpacity={1} onPress={onClose} />

                <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>

                    {/* ── Header ───────────────────────────────────────────────── */}
                    <View style={s.header}>
                        <View style={s.handle} />
                        <View style={s.headerRow}>
                            <View style={s.headerLeft}>
                                <Sliders size={18} color={Theme.colors.accent} />
                                <Text style={s.title}>Preview & Adjust</Text>
                            </View>
                            <View style={s.headerActions}>
                                <TouchableOpacity onPress={resetAdjustments} style={s.iconBtn}>
                                    <RotateCcw size={18} color="#64748b" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onClose} style={s.iconBtn}>
                                    <X size={18} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={s.subtitle}>
                            Preview updates in ~0.5s after each slider change.
                        </Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scroll}
                        scrollEnabled
                    >
                        {/* ── Preview image ─────────────────────────────────────── */}
                        <View style={s.previewContainer}>
                            {imageUri ? (
                                <Image
                                    source={{ uri: imageUri }}
                                    style={s.previewImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={s.previewPlaceholder} />
                            )}

                            {isLoading && (
                                <View style={s.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <Text style={s.loadingText}>Rendering…</Text>
                                </View>
                            )}

                            {error && !isLoading && (
                                <View style={s.errorBadge}>
                                    <Text style={s.errorText}>Preview failed — tap reset ↺</Text>
                                </View>
                            )}
                        </View>

                        {/* ── Adjustment accordion ──────────────────────────────── */}
                        <View style={s.accordion}>

                            {/* Accordion trigger row */}
                            <TouchableOpacity
                                style={[s.accordionTrigger, accordionOpen && s.accordionTriggerOpen]}
                                onPress={toggleAccordion}
                                activeOpacity={0.8}
                            >
                                <View style={s.accordionTriggerLeft}>
                                    <Sliders size={15} color={accordionOpen ? Theme.colors.accent : '#64748b'} />
                                    <Text style={[s.accordionLabel, accordionOpen && s.accordionLabelOpen]}>
                                        Adjust Settings
                                    </Text>
                                    {hasCustomValues && !accordionOpen && (
                                        <View style={s.customBadge}>
                                            <Text style={s.customBadgeText}>Modified</Text>
                                        </View>
                                    )}
                                </View>
                                <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                                    <ChevronDown size={18} color={accordionOpen ? Theme.colors.accent : '#64748b'} />
                                </Animated.View>
                            </TouchableOpacity>

                            {/* Accordion body — conditionally rendered */}
                            {accordionOpen && (
                                <View style={s.accordionBody}>
                                    {SLIDERS.map(({ key, label, min, max, step }) => (
                                        <View key={key} style={s.sliderRow}>
                                            <View style={s.sliderLabelRow}>
                                                <Text style={s.sliderLabel}>{label}</Text>
                                                <Text style={s.sliderValue}>
                                                    {key === 'hue'
                                                        ? `${Math.round(adjustments[key])}°`
                                                        : adjustments[key].toFixed(2)}
                                                </Text>
                                            </View>
                                            <PureSlider
                                                style={s.slider}
                                                minimumValue={min}
                                                maximumValue={max}
                                                step={step}
                                                value={adjustments[key]}
                                                onValueChange={(val) => updateAdjustment(key, val)}
                                                minimumTrackTintColor={Theme.colors.accent}
                                                maximumTrackTintColor="#e2e8f0"
                                                thumbTintColor={Theme.colors.accent}
                                            />
                                            <View style={s.sliderRange}>
                                                <Text style={s.rangeText}>
                                                    {key === 'hue' ? `${min}°` : min.toFixed(1)}
                                                </Text>
                                                <Text style={s.rangeText}>
                                                    {key === 'hue' ? `+${max}°` : max.toFixed(1)}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* ── Confirm button ────────────────────────────────────────── */}
                    <View style={s.footer}>
                        <TouchableOpacity
                            style={s.confirmBtn}
                            onPress={() => onConfirm(adjustments)}
                            activeOpacity={0.85}
                        >
                            <Check size={20} color="#fff" />
                            <Text style={s.confirmText}>Render with These Settings</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    dismiss:            { flex: 1 },
    sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_H * 0.92, overflow: 'hidden' },

    // Header
    header:             { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    handle:             { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    headerRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    headerLeft:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerActions:      { flexDirection: 'row', gap: 4 },
    iconBtn:            { padding: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
    title:              { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    subtitle:           { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: '#94a3b8', marginBottom: 4 },

    scroll:             { paddingBottom: 16 },

    // Preview
    previewContainer:   { marginHorizontal: 20, marginTop: 8, marginBottom: 16, aspectRatio: 0.75, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
    previewImage:       { width: '100%', height: '100%' },
    previewPlaceholder: { flex: 1, backgroundColor: '#e2e8f0' },
    loadingOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText:        { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.semibold },
    errorBadge:         { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(234,67,53,0.85)', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
    errorText:          { color: '#fff', fontSize: 12, fontFamily: Theme.fonts.outfit.semibold },

    // Accordion wrapper
    accordion:              { marginHorizontal: 20 },
    accordionTrigger:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
    accordionTriggerOpen:   { borderColor: Theme.colors.accent, backgroundColor: '#eff6ff' },
    accordionTriggerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    accordionLabel:         { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: '#334155' },
    accordionLabelOpen:     { color: Theme.colors.accent },
    customBadge:            { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    customBadgeText:        { fontSize: 10, fontFamily: Theme.fonts.outfit.semibold, color: '#92400e' },
    accordionBody:          { paddingTop: 12, paddingHorizontal: 4 },

    // Sliders
    sliderRow:          { marginBottom: 8 },
    sliderLabelRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    sliderLabel:        { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: '#334155' },
    sliderValue:        { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: Theme.colors.accent, minWidth: 40, textAlign: 'right' },
    slider:             { width: '100%', height: 36 },
    sliderRange:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
    rangeText:          { fontSize: 10, fontFamily: Theme.fonts.outfit.regular, color: '#94a3b8' },

    // Footer
    footer:             { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    confirmBtn:         { backgroundColor: Theme.colors.accent, height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    confirmText:        { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
});

