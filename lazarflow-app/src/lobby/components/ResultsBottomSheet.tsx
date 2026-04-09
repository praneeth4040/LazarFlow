import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { X, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Theme } from '../../styles/theme';
import { CustomAlert as Alert } from '../../lib/AlertService';

interface ResultsBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    imageUri: string | null;
}

export const ResultsBottomSheet: React.FC<ResultsBottomSheetProps> = ({ visible, onClose, imageUri }) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setDownloading(true);
            
            if (!imageUri) {
                Alert.alert('Error', 'No image to save');
                return;
            }

            let localUri = '';

            if (imageUri.startsWith('http')) {
                const filename = FileSystem.cacheDirectory + `result_${Date.now()}.png`;
                const downloadResult = await FileSystem.downloadAsync(imageUri, filename);
                localUri = downloadResult.uri;
            } else if (imageUri.startsWith('data:image')) {
                const base64Code = imageUri.split('base64,')[1];
                const filename = FileSystem.cacheDirectory + `result_${Date.now()}.png`;
                await FileSystem.writeAsStringAsync(filename, base64Code, {
                    encoding: 'base64',
                });
                localUri = filename;
            } else {
                localUri = imageUri;
            }

            await MediaLibrary.createAssetAsync(localUri);
            
            Alert.alert('Success', 'Image saved to gallery!');
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save image to gallery');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.sheetOverlay}>
                <TouchableOpacity 
                    style={styles.sheetDismiss} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Result Generated</Text>
                        <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                            <X size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                        <View style={styles.resultPreviewContainer}>
                            {imageUri && (
                                <Image 
                                    source={{ uri: imageUri }} 
                                    style={styles.resultPreviewImage} 
                                    resizeMode="contain" 
                                />
                            )}
                        </View>

                        <View style={styles.sheetActionRow}>
                            <TouchableOpacity 
                                style={[styles.sheetActionBtn, styles.downloadActionBtn]} 
                                onPress={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Download size={20} color="#fff" />
                                        <Text style={styles.downloadActionText}>Save to Gallery</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheetDismiss: { flex: 1 },
    sheetContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
    sheetHeader: { alignItems: 'center', paddingVertical: 15, position: 'relative' },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginBottom: 15 },
    sheetTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    sheetCloseBtn: { position: 'absolute', right: 0, top: 25 },
    sheetScroll: {},
    resultPreviewContainer: { width: '100%', aspectRatio: 0.7, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f8fafc', marginBottom: 20 },
    resultPreviewImage: { width: '100%', height: '100%' },
    sheetActionRow: { gap: 12 },
    sheetActionBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    downloadActionBtn: { backgroundColor: Theme.colors.accent },
    downloadActionText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
});
