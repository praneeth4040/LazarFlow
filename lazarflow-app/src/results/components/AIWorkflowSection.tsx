import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { Camera, Upload, Plus, X, Check, Bell, Info } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';

interface LobbyImage {
    uri: string;
}

interface ResultImage {
    uri: string;
}

interface AIWorkflowSectionProps {
    teams: any[];
    lobbyImages: LobbyImage[];
    resultImages: ResultImage[];
    processingLobby: boolean;
    extracting: boolean;
    aiPhase: string;
    aiJobStatus: string;
    lobbyPhase: string;
    onPickLobbyImages: () => void;
    onRemoveLobbyImage: (index: number) => void;
    onProcessLobby: () => void;
    onPickResultImages: () => void;
    onRemoveResultImage: (index: number) => void;
    onAIUpload: (images: ResultImage[]) => void;
}

export const AIWorkflowSection: React.FC<AIWorkflowSectionProps> = ({
    teams,
    lobbyImages,
    resultImages,
    processingLobby,
    extracting,
    aiPhase,
    aiJobStatus,
    lobbyPhase,
    onPickLobbyImages,
    onRemoveLobbyImage,
    onProcessLobby,
    onPickResultImages,
    onRemoveResultImage,
    onAIUpload,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (extracting) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.18, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [extracting]);

    return (
        <View style={styles.aiWorkflowContainer}>
            {/* ── Process Lobby Section ──────────────────────── */}
            <View style={styles.workflowSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.workflowSectionTitle}>Process Lobby</Text>
                    {teams.some(t => t.members && t.members.length > 0) ? (
                        <View style={styles.completedBadgeNew}>
                            <Text style={styles.completedBadgeTextNew}>COMPLETED</Text>
                        </View>
                    ) : (
                        <View style={styles.stepBadgeNew}>
                            <Text style={styles.stepBadgeTextNew}>STEP 1</Text>
                        </View>
                    )}
                </View>

                <View style={styles.workflowCard}>
                    <Text style={styles.workflowInstruction}>
                        Upload a lobby screenshot to automatically detect teams and players.
                    </Text>

                    {teams.some(t => t.members && t.members.length > 0) ? (
                        <View style={styles.uploadBoxProcessed}>
                            <View style={styles.successIconCircle}>
                                <Check size={32} color="#10b981" />
                            </View>
                            <Text style={styles.processedText}>Lobby Screenshot Processed</Text>
                        </View>
                    ) : processingLobby ? (
                        null
                    ) : (
                        <TouchableOpacity
                            style={styles.uploadBox}
                            onPress={onPickLobbyImages}
                        >
                            {lobbyImages.length > 0 ? (
                                <View style={styles.uploadedImagesGrid}>
                                    {lobbyImages.map((img, idx) => (
                                        <View key={idx} style={styles.miniPreviewContainer}>
                                            <Image source={{ uri: img.uri }} style={styles.miniImage} />
                                            <TouchableOpacity
                                                style={styles.removeMiniImageBtn}
                                                onPress={() => onRemoveLobbyImage(idx)}
                                            >
                                                <X size={12} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <TouchableOpacity
                                        style={styles.addMoreMiniBtn}
                                        onPress={onPickLobbyImages}
                                    >
                                        <Plus size={20} color={Theme.colors.accent} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <View style={styles.uploadIconCircle}>
                                        <Camera size={32} color={Theme.colors.accent} />
                                    </View>
                                    <Text style={styles.uploadBoxText}>Add Lobby Screenshot</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {teams.some(t => t.members && t.members.length > 0) ? (
                        <View style={styles.completedActionBtn}>
                            <Check size={20} color="#cbd5e1" style={{ marginRight: 8 }} />
                            <Text style={styles.completedActionBtnText}>Completed</Text>
                        </View>
                    ) : processingLobby ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 12, gap: 12 }}>
                            <View style={{
                                width: 60, height: 60, borderRadius: 30,
                                backgroundColor: Theme.colors.accent + '18',
                                borderWidth: 2, borderColor: Theme.colors.accent + '40',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <ActivityIndicator size="large" color={Theme.colors.accent} />
                            </View>
                            <View style={{ alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: Theme.colors.textPrimary, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
                                    {lobbyPhase === 'uploading' ? 'Uploading Screenshots...' : 'AI is Mapping Slots'}
                                </Text>
                                <Text style={{ color: Theme.colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
                                    {lobbyPhase === 'uploading' ? 'Sending images to the server' : 'Running in the background — safe to leave'}
                                </Text>
                            </View>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 8,
                                backgroundColor: Theme.colors.accent + '12',
                                borderWidth: 1, borderColor: Theme.colors.accent + '30',
                                borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8,
                            }}>
                                <Bell size={18} color={Theme.colors.accent} />
                                <Text style={{ color: Theme.colors.accent, fontWeight: '600', fontSize: 12 }}>You'll be notified when done</Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.primaryActionBtn, lobbyImages.length === 0 && styles.disabledBtn]}
                            onPress={onProcessLobby}
                            disabled={lobbyImages.length === 0}
                        >
                            <Text style={styles.primaryActionBtnText}>Process Lobby</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Extract Results Section ─────────────────────── */}
            <View style={styles.workflowSection}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.titleWithIcon}>
                        <Text style={styles.workflowSectionTitle}>Extract Results</Text>
                        <Info size={16} color={Theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                    </View>
                    <View style={styles.stepBadgeNew}>
                        <Text style={styles.stepBadgeTextNew}>STEP 2 / MANUAL</Text>
                    </View>
                </View>

                <View style={styles.workflowCard}>
                    {/* ── SUBMITTED / QUEUED STATE ───────────────────────── */}
                    {extracting ? (
                        <View style={{
                            alignItems: 'center',
                            paddingVertical: 28,
                            paddingHorizontal: 16,
                            gap: 14,
                        }}>
                            <Animated.View style={{
                                transform: [{ scale: pulseAnim }],
                                width: 72,
                                height: 72,
                                borderRadius: 36,
                                backgroundColor: Theme.colors.accent + '18',
                                borderWidth: 2,
                                borderColor: Theme.colors.accent + '40',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <ActivityIndicator size="large" color={Theme.colors.accent} />
                            </Animated.View>

                            <View style={{ alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: Theme.colors.textPrimary, fontWeight: '700', fontSize: 17, textAlign: 'center' }}>
                                    {aiPhase === 'uploading' ? 'Uploading Screenshots...' : 'LexiView AI is Analyzing'}
                                </Text>
                                <Text style={{ color: Theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                                    {aiPhase === 'uploading'
                                        ? 'Sending your images to the server'
                                        : aiJobStatus === 'running'
                                            ? 'Processing OCR and matching players'
                                            : 'Job queued — starting soon'}
                                </Text>
                            </View>

                            {aiPhase === 'queued' && (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    backgroundColor: Theme.colors.accent + '12',
                                    borderWidth: 1,
                                    borderColor: Theme.colors.accent + '30',
                                    borderRadius: 24,
                                    paddingHorizontal: 14,
                                    paddingVertical: 9,
                                }}>
                                    <Bell size={18} color={Theme.colors.accent} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: Theme.colors.accent, fontWeight: '600', fontSize: 13 }}>
                                            You'll be notified when done
                                        </Text>
                                        <Text style={{ color: Theme.colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                                            Safe to leave this screen
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {resultImages.length > 0 && (
                                <Text style={{ color: Theme.colors.textSecondary, fontSize: 12 }}>
                                    {resultImages.length} screenshot{resultImages.length > 1 ? 's' : ''} submitted
                                </Text>
                            )}
                        </View>
                    ) : aiPhase === 'done' ? (
                        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
                            <View style={styles.successIconCircle}>
                                <Check size={32} color="#10b981" />
                            </View>
                            <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 16 }}>Extraction Complete</Text>
                            <Text style={{ color: Theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                                Results loaded below — map teams and submit
                            </Text>
                        </View>
                    ) : (
                        /* ── IDLE STATE ─────────────────────────────────── */
                        <>
                            <Text style={styles.workflowInstruction}>
                                Upload match result screens. <Text style={{ color: Theme.colors.accent, fontWeight: 'bold' }}>Standalone extraction</Text> is supported.
                            </Text>

                            <TouchableOpacity
                                style={styles.uploadBox}
                                onPress={onPickResultImages}
                            >
                                {resultImages.length > 0 ? (
                                    <View style={styles.uploadedImagesGrid}>
                                        {resultImages.map((img, idx) => (
                                            <View key={idx} style={styles.miniPreviewContainer}>
                                                <Image source={{ uri: img.uri }} style={styles.miniImage} />
                                                <TouchableOpacity
                                                    style={styles.removeMiniImageBtn}
                                                    onPress={() => onRemoveResultImage(idx)}
                                                >
                                                    <X size={12} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <TouchableOpacity
                                            style={styles.addMoreMiniBtn}
                                            onPress={onPickResultImages}
                                        >
                                            <Plus size={20} color={Theme.colors.accent} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.uploadIconCircle}>
                                            <Upload size={32} color={Theme.colors.accent} />
                                        </View>
                                        <Text style={styles.uploadBoxText}>Upload Result Screenshots</Text>
                                        <Text style={styles.uploadBoxSubtext}>Select multiple images for all ranks</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.secondaryActionBtn, resultImages.length === 0 && styles.disabledBtn]}
                                onPress={() => onAIUpload(resultImages)}
                                disabled={resultImages.length === 0}
                            >
                                <Text style={styles.secondaryActionBtnText}>Extract From Screenshots</Text>
                            </TouchableOpacity>

                            <Text style={styles.independentModeHint}>
                                Independent mode: Requires manual team mapping
                            </Text>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
};