/**
 * DesImportPage.tsx — full-screen 3-step .des import wizard.
 *
 * Step 1 (Upload): pick a .des file + theme name.
 * Step 2 (Preview): backend decode → mapping_config conversion → demo render.
 * Step 3 (Review): "Yes — Verify & Use Now" (verified) or
 *                  "Send for Admin Review" (pending).
 *
 * Also the landing target for Android "Open with" intents carrying a .des
 * file (route param pendingDesUri, set by DesFileOpener in App.js).
 */
import React, { useContext, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, TextInput, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileUp, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { useDesImport } from '../hooks/useDesImport';
import { DesImportStatus } from '../../lib/desImport';

const STEP_LABELS = ['Upload', 'Preview', 'Review'] as const;

const formatSize = (bytes: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DesImportPage = ({ navigation, route }: any) => {
    const { user } = useContext(UserContext);
    const imp = useDesImport();
    const pendingHandledRef = useRef(false);

    // .des file handed over via an external "Open with" intent
    useEffect(() => {
        if (route.params?.pendingDesUri && !pendingHandledRef.current) {
            pendingHandledRef.current = true;
            imp.openFileUri(route.params.pendingDesUri as string);
            navigation.setParams({ pendingDesUri: undefined });
        }
    }, [route.params?.pendingDesUri, imp, navigation]);

    const finishImport = async (status: DesImportStatus) => {
        const result = await imp.submit(status);
        if (!result?.themeId) return;
        if (user?.id) {
            await AsyncStorage.removeItem(`cache_user_themes_${user.id}`);
        }
        imp.reset();
        navigation.navigate('DesignDetails', { themeId: result.themeId });
    };

    const ErrorBanner = imp.message ? (
        <View style={styles.errorBanner}>
            <AlertCircle size={15} color="#d97706" />
            <Text style={styles.errorText}>{imp.message}</Text>
            <TouchableOpacity onPress={() => imp.reset()}>
                <X size={15} color="#b45309" />
            </TouchableOpacity>
        </View>
    ) : null;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Import Design</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepRow}>
                {STEP_LABELS.map((label, i) => {
                    const n = i + 1;
                    const active = imp.step === n;
                    const done = imp.step > n;
                    return (
                        <View key={label} style={styles.stepItem}>
                            <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                                {done
                                    ? <CheckCircle2 size={13} color="#fff" />
                                    : <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>{n}</Text>}
                            </View>
                            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                            {n < STEP_LABELS.length && <View style={styles.stepLine} />}
                        </View>
                    );
                })}
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                    {ErrorBanner}

                    {/* ── Step 1: Upload ──────────────────────────────────── */}
                    {imp.step === 1 && (
                        <>
                            {!imp.file ? (
                                <TouchableOpacity style={styles.pickCard} onPress={imp.pickFile} activeOpacity={0.8}>
                                    <View style={styles.pickIconWrap}>
                                        <FileUp size={30} color={Theme.colors.accent} />
                                    </View>
                                    <Text style={styles.pickTitle}>Choose .des File</Text>
                                    <Text style={styles.pickSubtitle}>
                                        Have a design file? Pick it here to turn it into a theme.
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.fileCard}>
                                    <View style={styles.fileIconWrap}>
                                        <FileText size={20} color={Theme.colors.accent} />
                                    </View>
                                    <View style={styles.fileMeta}>
                                        <Text style={styles.fileName} numberOfLines={1}>{imp.file.name}</Text>
                                        <Text style={styles.fileSize}>
                                            {formatSize(imp.file.size) || 'Design file'} · .des
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={imp.pickFile} style={styles.changeBtn}>
                                        <Text style={styles.changeBtnText}>Change</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <Text style={styles.fieldLabel}>Design Name</Text>
                            <TextInput
                                style={styles.nameInput}
                                value={imp.name}
                                onChangeText={imp.setName}
                                placeholder="e.g. E-sports Standings"
                                placeholderTextColor="#b0b7c3"
                                autoCapitalize="words"
                                returnKeyType="done"
                            />
                            <Text style={styles.fieldHint}>
                                Standings (points table) designs are supported. Imported designs are
                                checked in Preview before anything is saved.
                            </Text>

                            <TouchableOpacity
                                style={[styles.primaryBtn, (!imp.file || imp.previewing) && styles.btnDisabled]}
                                onPress={imp.startPreview}
                                disabled={!imp.file || imp.previewing}
                            >
                                {imp.previewing ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={styles.primaryBtnText}>Decoding design…</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.primaryBtnText}>Decode &amp; Preview</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── Step 2: Preview ─────────────────────────────────── */}
                    {imp.step === 2 && imp.preview && (
                        <>
                            {imp.preview.preview ? (
                                <View style={styles.previewWrap}>
                                    <Image
                                        source={{ uri: imp.preview.preview }}
                                        style={styles.previewImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            ) : (
                                <View style={[styles.previewWrap, styles.previewMissing]}>
                                    <AlertCircle size={22} color="#d97706" />
                                    <Text style={styles.previewMissingText}>
                                        Couldn't render the demo preview, but the design decoded
                                        successfully. You can still continue.
                                    </Text>
                                </View>
                            )}

                            {imp.preview.audit.unknown_count > 0 && (
                                <View style={styles.auditBanner}>
                                    <AlertCircle size={14} color="#d97706" />
                                    <Text style={styles.auditText}>
                                        This design uses {imp.preview.audit.unknown_count} detail
                                        {imp.preview.audit.unknown_count === 1 ? '' : 's'} LazarFlow
                                        doesn't support yet — it may render slightly differently.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryName} numberOfLines={1}>{imp.preview.name}</Text>
                                <Text style={styles.summaryMeta}>
                                    {imp.preview.image.width ?? '?'} × {imp.preview.image.height ?? '?'} ·
                                    {' '}{imp.preview.mappingConfig?.cells?.length ?? 0} rows mapped
                                </Text>
                            </View>

                            <TouchableOpacity style={styles.linkBtn} onPress={imp.goBackToStep1}>
                                <Text style={styles.linkBtnText}>Change file or name</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.primaryBtn} onPress={imp.goToReview}>
                                <Text style={styles.primaryBtnText}>Continue to Review</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── Step 3: Review ──────────────────────────────────── */}
                    {imp.step === 3 && imp.preview && (
                        <>
                            <View style={styles.reviewCard}>
                                {imp.preview.preview ? (
                                    <Image
                                        source={{ uri: imp.preview.preview }}
                                        style={styles.reviewThumb}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[styles.reviewThumb, styles.reviewThumbEmpty]}>
                                        <FileText size={24} color={Theme.colors.border} />
                                    </View>
                                )}
                                <View style={styles.fileMeta}>
                                    <Text style={styles.fileName} numberOfLines={1}>{imp.preview.name}</Text>
                                    <Text style={styles.fileSize}>{imp.file?.name}</Text>
                                </View>
                            </View>

                            <Text style={styles.reviewQuestion}>Does the preview look correct?</Text>

                            <TouchableOpacity
                                style={[styles.primaryBtn, imp.confirming && styles.btnDisabled]}
                                onPress={() => finishImport('verified')}
                                disabled={imp.confirming}
                            >
                                {imp.confirming ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>Yes — Verify &amp; Use Now</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryBtn, imp.confirming && styles.btnDisabled]}
                                onPress={() => finishImport('pending')}
                                disabled={imp.confirming}
                            >
                                <Text style={styles.secondaryBtnText}>Send for Admin Review</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.linkBtn} onPress={imp.goBackToStep2}>
                                <Text style={styles.linkBtnText}>Back to preview</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff',
    },
    backButton: { width: 40, alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    stepRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', paddingBottom: 14, paddingHorizontal: 20, gap: 6,
    },
    stepItem: { flexDirection: 'row', alignItems: 'center' },
    stepDot: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0',
        alignItems: 'center', justifyContent: 'center',
    },
    stepDotActive: { backgroundColor: Theme.colors.accent },
    stepDotDone: { backgroundColor: '#10b981' },
    stepDotText: { fontSize: 11, fontFamily: Theme.fonts.outfit.bold, color: '#64748b' },
    stepDotTextActive: { color: '#fff' },
    stepLabel: {
        fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: '#94a3b8', marginHorizontal: 6,
    },
    stepLabelActive: { color: Theme.colors.accent, fontFamily: Theme.fonts.outfit.bold },
    stepLine: { width: 18, height: 2, backgroundColor: '#e2e8f0', borderRadius: 1 },
    body: { flex: 1 },
    bodyContent: { padding: 20, paddingBottom: 40 },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        borderRadius: 12, padding: 12, marginBottom: 14,
    },
    errorText: { flex: 1, fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, color: '#b45309', lineHeight: 17 },
    pickCard: {
        borderWidth: 2, borderColor: Theme.colors.accent, borderStyle: 'dashed',
        borderRadius: 18, backgroundColor: '#fff', alignItems: 'center',
        paddingVertical: 34, paddingHorizontal: 20, marginBottom: 18,
    },
    pickIconWrap: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    pickTitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    pickSubtitle: {
        fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: '#64748b',
        textAlign: 'center', marginTop: 6, lineHeight: 18,
    },
    fileCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 14,
        padding: 14, backgroundColor: '#fff', marginBottom: 18,
    },
    fileIconWrap: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff',
        alignItems: 'center', justifyContent: 'center',
    },
    fileMeta: { flex: 1 },
    fileName: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    fileSize: { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: '#64748b', marginTop: 2 },
    changeBtn: {
        borderWidth: 1, borderColor: Theme.colors.accent, borderRadius: 9,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    changeBtnText: { fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    fieldLabel: {
        fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: '#475569',
        marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
    },
    nameInput: {
        borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
        fontFamily: Theme.fonts.outfit.medium, color: '#0f172a', backgroundColor: '#fff',
        marginBottom: 10,
    },
    fieldHint: {
        fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: '#94a3b8',
        lineHeight: 17, marginBottom: 20,
    },
    previewWrap: {
        borderRadius: 14, borderWidth: 1, borderColor: Theme.colors.border,
        backgroundColor: '#fff', marginBottom: 14, overflow: 'hidden',
    },
    previewImage: { width: '100%', height: 300 },
    previewMissing: {
        padding: 24, alignItems: 'center', gap: 10,
    },
    previewMissingText: {
        fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: '#b45309',
        textAlign: 'center', lineHeight: 17,
    },
    auditBanner: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        borderRadius: 12, padding: 12, marginBottom: 14,
    },
    auditText: {
        flex: 1, fontSize: 12, fontFamily: Theme.fonts.outfit.medium,
        color: '#b45309', lineHeight: 17,
    },
    summaryCard: {
        borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 14,
        padding: 14, backgroundColor: '#fff', marginBottom: 12,
    },
    summaryName: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    summaryMeta: { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: '#64748b', marginTop: 4 },
    linkBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
    linkBtnText: { fontSize: 13, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },
    primaryBtn: {
        backgroundColor: Theme.colors.accent, height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginTop: 6,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    secondaryBtn: {
        backgroundColor: '#fff', height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginTop: 10,
        borderWidth: 1, borderColor: Theme.colors.border,
    },
    secondaryBtnText: { color: '#0f172a', fontSize: 15, fontFamily: Theme.fonts.outfit.bold },
    btnDisabled: { opacity: 0.6 },
    reviewCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 14,
        padding: 14, backgroundColor: '#fff', marginBottom: 18,
    },
    reviewThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#f1f5f9' },
    reviewThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    reviewQuestion: {
        fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a',
        textAlign: 'center', marginBottom: 16,
    },
});

export default DesImportPage;
