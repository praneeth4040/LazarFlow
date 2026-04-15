/**
 * useRenderPreview.ts
 *
 * Real-time preview hook for the /api/render/preview-render endpoint.
 *
 * - Debounces adjustment changes at 300ms so we don't hammer the server.
 * - Cancels in-flight requests via AbortController when the slider moves again.
 * - Converts the binary JPEG stream to a base64 data URI for <Image>.
 * - No auth required (preview endpoint is public).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../../lib/apiClient';

export interface Adjustments {
    contrast:   number;   // 0.5 – 2.0  (1.0 = original)
    saturation: number;   // 0.0 – 2.0
    brightness: number;   // 0.5 – 2.0
    sharpness:  number;   // 0.0 – 2.0
    hue:        number;   // -180 – 180 (0 = no change)
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
    contrast:   1.0,
    saturation: 1.0,
    brightness: 1.0,
    sharpness:  1.0,
    hue:        0,
};

export function useRenderPreview(themeId: string | null) {
    const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
    const [imageUri, setImageUri]       = useState<string | null>(null);
    const [isLoading, setIsLoading]     = useState(false);
    const [error, setError]             = useState<string | null>(null);

    const debounceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortController  = useRef<AbortController | null>(null);

    const fetchPreview = useCallback(async (current: Adjustments) => {
        if (!themeId) return;

        // Cancel any in-flight request – user moved slider again
        if (abortController.current) abortController.current.abort();
        abortController.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BASE_URL}/api/render/preview-render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // ngrok requires this header to skip the browser warning page
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({ themeId, adjustments: current }),
                signal: abortController.current.signal,
            });

            if (!response.ok) throw new Error(`Render failed: ${response.status}`);

            // Convert binary JPEG → base64 data URI  (React Native compatible)
            const blob       = await response.blob();
            const reader     = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setImageUri(reader.result);  // data:image/jpeg;base64,...
                }
            };
            reader.readAsDataURL(blob);
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                setError(err?.message ?? 'Unknown error');
                console.error('❌ Preview render error:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [themeId]);

    /** Call this from slider onValueChange */
    const updateAdjustment = useCallback((key: keyof Adjustments, value: number) => {
        const next = { ...adjustments, [key]: value };
        setAdjustments(next);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchPreview(next), 300);
    }, [adjustments, fetchPreview]);

    /** Reset all sliders to defaults and re-fetch */
    const resetAdjustments = useCallback(() => {
        setAdjustments(DEFAULT_ADJUSTMENTS);
        fetchPreview(DEFAULT_ADJUSTMENTS);
    }, [fetchPreview]);

    // Initial fetch when themeId changes
    useEffect(() => {
        setAdjustments(DEFAULT_ADJUSTMENTS);
        fetchPreview(DEFAULT_ADJUSTMENTS);

        return () => {
            if (debounceTimer.current)   clearTimeout(debounceTimer.current);
            if (abortController.current) abortController.current.abort();
        };
    }, [themeId]);

    return { imageUri, isLoading, adjustments, updateAdjustment, resetAdjustments, error };
}
