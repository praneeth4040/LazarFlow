/**
 * useDesImport.ts — drives the 3-step .des import wizard.
 *
 * Step 1: pick/open a .des file + theme name.
 * Step 2: decode + convert + demo preview (backend dry run).
 * Step 3: review → create as 'verified' or send as 'pending'.
 *
 * The page component is presentational; all flow logic lives here.
 */
import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { CustomAlert as Alert } from '../../lib/AlertService';
import {
    DesFileInfo,
    DesImportError,
    DesImportResult,
    DesImportStatus,
    DesPreviewResult,
    confirmDesImport,
    prepareDesFile,
    previewDesImport,
} from '../../lib/desImport';

/** Map error codes to user-facing copy. */
export const desImportErrorMessage = (err: unknown): string => {
    if (err instanceof DesImportError) {
        switch (err.code) {
            case 'INVALID_EXTENSION':
                return 'Only .des design files can be imported.';
            case 'FILE_TOO_LARGE':
                return 'That design file is too large (64 MB max).';
            case 'READ_FAILED':
                return 'Could not read the selected design file. Please try again.';
            case 'NETWORK':
                return 'Network error \u2014 check your connection and try again.';
            case 'INVALID_DES_FILE':
                return 'This file isn\u2019t a valid design file, or it\u2019s corrupted.';
            case 'UNSUPPORTED_DES_MODEL':
                return 'Only standings designs are supported right now.';
            case 'IMPORT_FAILED':
                return 'The import couldn\u2019t be completed. Please try again in a moment.';
        }
    }
    return 'Something went wrong importing this design. Please try again.';
};

export const useDesImport = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<DesFileInfo | null>(null);
    const [name, setName] = useState('');
    const [previewing, setPreviewing] = useState(false);
    const [preview, setPreview] = useState<DesPreviewResult | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const reset = useCallback(() => {
        setStep(1);
        setFile(null);
        setName('');
        setPreview(null);
        setPreviewing(false);
        setConfirming(false);
        setMessage(null);
    }, []);

    /** Stage a validated file (step 1). Does NOT decode yet. */
    const stageFile = useCallback((info: DesFileInfo) => {
        setFile(info);
        setName(prev => prev || info.name.replace(/\.des$/i, ''));
        setPreview(null);
        setMessage(null);
        setStep(1);
    }, []);

    /** Design-tab / wizard entry: open the native document picker. */
    const pickFile = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                // .des has no registered MIME type — pick anything, validate by extension
                type: '*/*',
                multiple: false,
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.length) return;
            const asset = result.assets[0];
            const info = await prepareDesFile(asset.uri, asset.name || undefined);
            stageFile(info);
        } catch (err) {
            Alert.alert('Import Design', desImportErrorMessage(err));
        }
    }, [stageFile]);

    /**
     * Open-with intent path: the app was asked to open a .des URI
     * (content:// or file://) — normalize, validate, stage on step 1.
     */
    const openFileUri = useCallback(async (uri: string, fallbackName?: string) => {
        try {
            const derived = fallbackName
                || decodeURIComponent(uri.split('/').pop() || '').split('?')[0]
                || undefined;
            const info = await prepareDesFile(uri, derived);
            stageFile(info);
        } catch (err) {
            Alert.alert('Import Design', desImportErrorMessage(err));
        }
    }, [stageFile]);

    /** Step 1 → 2: decode + convert + demo preview (backend dry run). */
    const startPreview = useCallback(async () => {
        if (!file) return;
        setPreviewing(true);
        setMessage(null);
        try {
            const result = await previewDesImport(file, name);
            setPreview(result);
            setStep(2);
        } catch (err) {
            setMessage(desImportErrorMessage(err));
        } finally {
            setPreviewing(false);
        }
    }, [file, name]);

    const goBackToStep1 = useCallback(() => {
        setStep(1);
        setPreview(null);
        setMessage(null);
    }, []);

    const goBackToStep2 = useCallback(() => {
        setStep(2);
        setMessage(null);
    }, []);

    /** Step 2 → 3: preview accepted, move to the review choice. */
    const goToReview = useCallback(() => {
        setStep(3);
        setMessage(null);
    }, []);

    /** Step 3: create the theme with the chosen review outcome. */
    const submit = useCallback(async (status: DesImportStatus): Promise<DesImportResult | null> => {
        if (!file) return null;
        setConfirming(true);
        setMessage(null);
        try {
            const result = await confirmDesImport(file, name, status);
            return result;
        } catch (err) {
            setMessage(desImportErrorMessage(err));
            return null;
        } finally {
            setConfirming(false);
        }
    }, [file, name]);

    return {
        step, file, name, setName,
        previewing, preview,
        confirming, message,
        pickFile, openFileUri,
        startPreview, goBackToStep1, goBackToStep2, goToReview,
        submit, reset,
    };
};
