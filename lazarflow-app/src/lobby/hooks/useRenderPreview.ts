/**
 * useRenderPreview.ts
 *
 * Pure adjustment-state manager.
 * No network whatsoever — all color changes are applied client-side via SVG.
 * Sharpness removed (requires convolution kernel, stays backend-only).
 */
import { useState, useCallback } from 'react';
export type { Adjustments, DEFAULT_ADJUSTMENTS } from '../../shared/utils/colorMatrix';
import { Adjustments, DEFAULT_ADJUSTMENTS } from '../../shared/utils/colorMatrix';

export function useRenderPreview() {
    const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);

    const updateAdjustment = useCallback((key: keyof Adjustments, value: number) => {
        setAdjustments(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetAdjustments = useCallback(() => {
        setAdjustments(DEFAULT_ADJUSTMENTS);
    }, []);

    const hasCustomValues =
        adjustments.contrast   !== 1.0 ||
        adjustments.saturation !== 1.0 ||
        adjustments.brightness !== 1.0 ||
        adjustments.hue        !== 0;

    return { adjustments, updateAdjustment, resetAdjustments, hasCustomValues };
}
