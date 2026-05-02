/**
 * AdjustmentPreviewSheet.tsx
 *
 * NEW FLOW:
 *   Backend renders image (with full team data) → stored as `renderedImageUri`
 *   Sheet opens showing that image → user adjusts color via SVG filter (instant)
 *   User taps "Download" → view-shot captures the filtered view → saves to gallery
 *
 * No backend calls happen inside this sheet.
 * Sharpness removed — client-side sharpening requires convolution, not feasible.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, ScrollView,
    TouchableOpacity, Dimensions, Animated, ActivityIndicator,
} from 'react-native';
import { X, RotateCcw, Download, Sliders, ChevronDown } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { Theme } from '../../styles/theme';
import { useRenderPreview } from '../hooks/useRenderPreview';
import { Adjustments } from '../../shared/utils/colorMatrix';
import { FilteredImage } from '../../shared/components/FilteredImage';
import Slider from '@react-native-community/slider';
import { CustomAlert as Alert } from '../../lib/AlertService';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Slider config (sharpness removed) ─────────────────────────────────────────

const SLIDERS: { key: keyof Adjustments; label: string; min: number; max: number; step: number }[] = [
    { key: 'contrast',   label: 'Contrast',   min: 0.5,  max: 2.0, step: 0.05 },
    { key: 'saturation', label: 'Saturation', min: 0.0,  max: 2.0, step: 0.05 },
    { key: 'brightness', label: 'Brightness', min: 0.5,  max: 2.0, step: 0.05 },
    { key: 'hue',        label: 'Hue',        min: -180, max: 180, step: 1    },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
    visible:          boolean;
    renderedImageUri: string | null;   // base64 or URL of the backend-rendered full image
    onClose:          () => void;
}

export const AdjustmentPreviewSheet: React.FC<Props> = ({
    visible, renderedImageUri, onClose,
}) => {
    const { adjustments, updateAdjustment, resetAdjustments, hasCustomValues } =
        useRenderPreview();

    const [accordionOpen, setAccordionOpen]   = useState(false);
    const [downloading,   setDownloading]     = useState(false);

    // Ref for view-shot capture (the filtered image)
    const imageRef = useRef<View>(null);

    // Sheet slide-up animation
    const slideY   = useRef(new Animated.Value(SCREEN_H)).current;
    const chevronR = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(slideY, {
            toValue:         visible ? 0 : SCREEN_H,
            useNativeDriver: true,
            tension:         65,
            friction:        11,
        }).start();

        // Reset sliders and accordion when sheet opens fresh
        if (!visible) {
            resetAdjustments();
            setAccordionOpen(false);
            chevronR.setValue(0);
        }
    }, [visible]);

    const toggleAccordion = () => {
        const next = !accordionOpen;
        Animated.timing(chevronR, {
            toValue:         next ? 1 : 0,
            duration:        220,
            useNativeDriver: true,
        }).start();
        setAccordionOpen(next);
    };

    const chevronRotation = chevronR.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    // ── Download ───────────────────────────────────────────────────────────────

    const handleDownload = async () => {
        if (!imageRef.current) return;

        try {
            setDownloading(true);

            // writeOnly=true: only requests photo-write access — avoids audio
            // permission which is not declared in Expo Go's manifest.
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert(
                    'Permission required',
                    'Please grant gallery access to save images.',
                );
                return;
            }

            // Capture the SVG-filtered view at full pixel density
            // Note: react-native-view-shot captures at native resolution by default.
            const uri = await captureRef(imageRef, {
                format:  'jpg',
                quality: 0.95,
                result:  'tmpfile',
            });

            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Saved!', 'Image saved to your gallery.');
            onClose();
        } catch (err) {
            console.error('❌ Download error:', err);
            Alert.alert('Error', 'Failed to save the image. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={s.overlay}>
                <TouchableOpacity style={s.dismiss} activeOpacity={1} onPress={onClose} />

                <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <View style={s.header}>
                        <View style={s.handle} />
                        <View style={s.headerRow}>
                            <View style={s.headerLeft}>
                                <Sliders size={18} color={Theme.colors.accent} />
                                <Text style={s.title}>Adjust & Download</Text>
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
                            Rendered with your team data. Adjust colors, then download.
                        </Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.scroll}
                    >
                        {/* ── Rendered image with live filter ──────────────── */}
                        <View style={s.previewContainer}>
                            {renderedImageUri ? (
                                <FilteredImage
                                    ref={imageRef}
                                    source={{ uri: renderedImageUri }}
                                    adjustments={adjustments}
                                    style={s.previewImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={s.previewPlaceholder}>
                                    <ActivityIndicator color={Theme.colors.accent} />
                                </View>
                            )}
                        </View>

                        {/* ── Accordion: adjustment sliders ────────────────── */}
                        <View style={s.accordion}>
                            <TouchableOpacity
                                style={[s.accordionTrigger, accordionOpen && s.accordionTriggerOpen]}
                                onPress={toggleAccordion}
                                activeOpacity={0.8}
                            >
                                <View style={s.accordionLeft}>
                                    <Sliders size={15} color={accordionOpen ? Theme.colors.accent : '#64748b'} />
                                    <Text style={[s.accordionLabel, accordionOpen && s.accordionLabelOpen]}>
                                        Adjust Colors
                                    </Text>
                                    {hasCustomValues && !accordionOpen && (
                                        <View style={s.modifiedBadge}>
                                            <Text style={s.modifiedText}>Modified</Text>
                                        </View>
                                    )}
                                </View>
                                <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                                    <ChevronDown size={18} color={accordionOpen ? Theme.colors.accent : '#64748b'} />
                                </Animated.View>
                            </TouchableOpacity>

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
                                            <Slider
                                                style={s.slider}
                                                minimumValue={min}
                                                maximumValue={max}
                                                step={step}
                                                value={adjustments[key]}
                                                onValueChange={val => updateAdjustment(key, val)}
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

                    {/* ── Download button ───────────────────────────────────── */}
                    <View style={s.footer}>
                        <TouchableOpacity
                            style={[s.downloadBtn, downloading && s.downloadBtnDisabled]}
                            onPress={handleDownload}
                            activeOpacity={0.85}
                            disabled={downloading || !renderedImageUri}
                        >
                            {downloading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Download size={20} color="#fff" />
                            )}
                            <Text style={s.downloadText}>
                                {downloading ? 'Saving…' : 'Download Image'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    overlay:              { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    dismiss:              { flex: 1 },
    sheet:                { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_H * 0.92, overflow: 'hidden' },

    header:               { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    handle:               { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    headerRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    headerLeft:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerActions:        { flexDirection: 'row', gap: 4 },
    iconBtn:              { padding: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
    title:                { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    subtitle:             { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: '#94a3b8', marginBottom: 4 },

    scroll:               { paddingBottom: 16 },

    previewContainer:     { marginHorizontal: 20, marginTop: 8, marginBottom: 16, aspectRatio: 0.75, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
    previewImage:         { width: '100%', height: '100%' },
    previewPlaceholder:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0' },

    accordion:            { marginHorizontal: 20 },
    accordionTrigger:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
    accordionTriggerOpen: { borderColor: Theme.colors.accent, backgroundColor: '#eff6ff' },
    accordionLeft:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    accordionLabel:       { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: '#334155' },
    accordionLabelOpen:   { color: Theme.colors.accent },
    modifiedBadge:        { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    modifiedText:         { fontSize: 10, fontFamily: Theme.fonts.outfit.semibold, color: '#92400e' },
    accordionBody:        { paddingTop: 12, paddingHorizontal: 4 },

    sliderRow:            { marginBottom: 8 },
    sliderLabelRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    sliderLabel:          { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: '#334155' },
    sliderValue:          { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: Theme.colors.accent, minWidth: 40, textAlign: 'right' },
    slider:               { width: '100%', height: 36 },
    sliderRange:          { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
    rangeText:            { fontSize: 10, fontFamily: Theme.fonts.outfit.regular, color: '#94a3b8' },

    footer:               { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    downloadBtn:          { backgroundColor: Theme.colors.accent, height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    downloadBtnDisabled:  { opacity: 0.6 },
    downloadText:         { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
});
