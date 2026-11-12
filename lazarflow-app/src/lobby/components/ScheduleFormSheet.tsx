/**
 * ScheduleFormSheet.tsx — pre-render input for Schedule cards.
 *
 * Schedule themes are background graphics whose mapping_config defines
 * extra_fields overlays (title / idp_time / start_time — schema lives in the
 * render-type registry). This sheet collects those values before the render
 * call and remembers the last-used values per lobby.
 *
 * Time fields use the native time picker; the user chooses 12h/24h display
 * and stored values are re-formatted when the preference changes.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Megaphone, Clock } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { getRenderType } from '../../shared/domain/renderTypes';
import { formatTime, parseTimeDisplay, reformatTime } from '../../shared/utils/timeFormat';

const scheduleType = getRenderType('schedule')!;

interface ScheduleFormSheetProps {
    visible: boolean;
    onClose: () => void;
    /** Called with the field values keyed by registry field key. */
    onSave: (values: Record<string, string>) => void;
    lobbyId: string;
}

const storageKey = (lobbyId: string) => `schedule_details_${lobbyId}`;

export const ScheduleFormSheet: React.FC<ScheduleFormSheetProps> = ({ visible, onClose, onSave, lobbyId }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const [use24Hour, setUse24Hour] = useState(false);
    const [timeField, setTimeField] = useState<string | null>(null);
    const [pickerDate, setPickerDate] = useState(new Date());
    const [saving, setSaving] = useState(false);

    // Load last-used values + format preference for this lobby whenever the sheet opens
    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        AsyncStorage.getItem(storageKey(lobbyId))
            .then(raw => {
                if (cancelled || !raw) return;
                const saved = JSON.parse(raw);
                const { __use24Hour, ...fields } = saved;
                setValues(fields);
                if (typeof __use24Hour === 'boolean') setUse24Hour(__use24Hour);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [visible, lobbyId]);

    const setValue = (key: string, v: string) => setValues(prev => ({ ...prev, [key]: v }));

    const toggleFormat = (use24: boolean) => {
        if (use24 === use24Hour) return;
        setUse24Hour(use24);
        setValues(prev => {
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([k, v]) => { next[k] = reformatTime(v, use24) ?? v; });
            return next;
        });
    };

    const openTimePicker = (key: string) => {
        const parsed = parseTimeDisplay(values[key]);
        const d = new Date();
        if (parsed) {
            d.setHours(parsed.hour24, parsed.minute, 0, 0);
        } else {
            d.setHours(12, 0, 0, 0);
        }
        setPickerDate(d);
        setTimeField(key);
    };

    const handleTimeChange = (_event: any, date?: Date) => {
        const key = timeField;
        setTimeField(null); // unmount the native dialog either way (Android)
        if (key && date) {
            setValue(key, formatTime(date.getHours(), date.getMinutes(), use24Hour));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await AsyncStorage.setItem(storageKey(lobbyId), JSON.stringify({ __use24Hour: use24Hour, ...values }));
        } catch (err) {
            console.warn('Could not persist schedule details:', err);
        }
        onSave(values);
        setSaving(false);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.sheetWrapper}
                >
                    <View style={styles.sheet}>
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <Megaphone size={18} color={Theme.colors.accent} />
                            </View>
                            <Text style={styles.title}>Schedule Details</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.subtitle}>
                                These details are printed onto the schedule design.
                            </Text>

                            {/* 12h / 24h display preference */}
                            <View style={styles.formatRow}>
                                <Text style={styles.formatLabel}>Time Format</Text>
                                <View style={styles.formatToggle}>
                                    <TouchableOpacity
                                        style={[styles.formatBtn, !use24Hour && styles.formatBtnActive]}
                                        onPress={() => toggleFormat(false)}
                                    >
                                        <Text style={[styles.formatBtnText, !use24Hour && styles.formatBtnTextActive]}>12h</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.formatBtn, use24Hour && styles.formatBtnActive]}
                                        onPress={() => toggleFormat(true)}
                                    >
                                        <Text style={[styles.formatBtnText, use24Hour && styles.formatBtnTextActive]}>24h</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {scheduleType.fields.map(field => (
                                <View key={field.key} style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>{field.label}</Text>
                                    {field.kind === 'time' ? (
                                        <TouchableOpacity
                                            style={styles.input}
                                            onPress={() => openTimePicker(field.key)}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.inputText,
                                                    !values[field.key] && styles.inputPlaceholder,
                                                ]}
                                            >
                                                {values[field.key] || field.sample}
                                            </Text>
                                            <Clock size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                    ) : (
                                        <TextInput
                                            style={styles.inputAsText}
                                            value={values[field.key] ?? ''}
                                            onChangeText={v => setValue(field.key, v)}
                                            placeholder={field.sample}
                                            placeholderTextColor="#b0b7c3"
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            returnKeyType="done"
                                        />
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            <Text style={styles.saveBtnText}>Save & Continue</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>

            {/* Native time picker dialog — mounted only while picking */}
            {visible && timeField && (
                <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    is24Hour={use24Hour}
                    onChange={handleTimeChange}
                />
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    dismiss: { flex: 1 },
    sheetWrapper: { width: '100%' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 34,
        paddingTop: 8,
        maxHeight: '85%',
    },
    header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    headerIcon: {
        width: 36, height: 36, borderRadius: 12, backgroundColor: '#eff6ff',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    title: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a', flex: 1 },
    closeBtn: { padding: 4 },
    subtitle: {
        fontSize: 13, fontFamily: Theme.fonts.outfit.regular, color: '#64748b',
        marginBottom: 14, marginTop: 2,
    },
    formatRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
    },
    formatLabel: {
        fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: '#475569',
        letterSpacing: 0.3, textTransform: 'uppercase',
    },
    formatToggle: {
        flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 3,
    },
    formatBtn: {
        paddingHorizontal: 16, paddingVertical: 6, borderRadius: 13,
    },
    formatBtnActive: {
        backgroundColor: Theme.colors.accent,
    },
    formatBtnText: {
        fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: '#64748b',
    },
    formatBtnTextActive: {
        color: '#fff',
    },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: {
        fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: '#475569',
        marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
    },
    input: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#f8fafc',
    },
    inputAsText: {
        borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
        fontFamily: Theme.fonts.outfit.medium, color: '#0f172a', backgroundColor: '#f8fafc',
    },
    inputText: {
        fontSize: 15, fontFamily: Theme.fonts.outfit.medium, color: '#0f172a',
    },
    inputPlaceholder: {
        color: '#b0b7c3',
    },
    saveBtn: {
        backgroundColor: Theme.colors.accent, height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginTop: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
});
