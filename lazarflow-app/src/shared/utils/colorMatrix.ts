/**
 * colorMatrix.ts
 *
 * Pure-JS SVG color matrix math for client-side image adjustments.
 * Sharpness deliberately excluded — it requires a convolution kernel
 * which is not possible with SVG feColorMatrix.
 *
 * All adjustments reduce to a single 4×5 matrix — one pass, zero network.
 */

export interface Adjustments {
    contrast:   number;   // 0.5 – 2.0  (1.0 = original)
    saturation: number;   // 0.0 – 2.0
    brightness: number;   // 0.5 – 2.0
    hue:        number;   // -180 – 180 (0 = no change)
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
    contrast:   1.0,
    saturation: 1.0,
    brightness: 1.0,
    hue:        0,
};

// ── Identity matrix ────────────────────────────────────────────────────────────

const identity = (): number[] => [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
];

// ── Matrix multiply (A × B for 4×5 color matrices) ────────────────────────────

function multiply(a: number[], b: number[]): number[] {
    const out = new Array(20).fill(0);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
            let v = 0;
            for (let k = 0; k < 4; k++) v += a[r * 5 + k] * b[k * 5 + c];
            if (c === 4) v += a[r * 5 + 4];
            out[r * 5 + c] = v;
        }
    }
    return out;
}

// ── Individual transforms ──────────────────────────────────────────────────────

function brightnessMatrix(b: number): number[] {
    return [b, 0, 0, 0, 0,  0, b, 0, 0, 0,  0, 0, b, 0, 0,  0, 0, 0, 1, 0];
}

function contrastMatrix(c: number): number[] {
    const t = 0.5 * (1 - c);
    return [c, 0, 0, 0, t,  0, c, 0, 0, t,  0, 0, c, 0, t,  0, 0, 0, 1, 0];
}

function saturationMatrix(s: number): number[] {
    const Wr = 0.2126, Wg = 0.7152, Wb = 0.0722;
    const r = Wr * (1 - s), g = Wg * (1 - s), b = Wb * (1 - s);
    return [
        r + s, g,     b,     0, 0,
        r,     g + s, b,     0, 0,
        r,     g,     b + s, 0, 0,
        0,     0,     0,     1, 0,
    ];
}

// W3C SVG spec hue rotation: https://www.w3.org/TR/filter-effects/#feColorMatrixElement
function hueRotateMatrix(deg: number): number[] {
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    return [
        0.213 + c * 0.787 - s * 0.213,  0.715 - c * 0.715 - s * 0.715,  0.072 - c * 0.072 + s * 0.928,  0, 0,
        0.213 - c * 0.213 + s * 0.143,  0.715 + c * 0.285 + s * 0.140,  0.072 - c * 0.072 - s * 0.283,  0, 0,
        0.213 - c * 0.213 - s * 0.787,  0.715 - c * 0.715 + s * 0.715,  0.072 + c * 0.928 + s * 0.072,  0, 0,
        0, 0, 0, 1, 0,
    ];
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute the combined SVG feColorMatrix values string.
 * Apply order: brightness → contrast → saturation → hue (matches PIL order).
 */
export function computeColorMatrix(adj: Adjustments): string {
    let m = identity();
    if (adj.brightness !== 1.0) m = multiply(brightnessMatrix(adj.brightness), m);
    if (adj.contrast   !== 1.0) m = multiply(contrastMatrix(adj.contrast), m);
    if (adj.saturation !== 1.0) m = multiply(saturationMatrix(adj.saturation), m);
    if (adj.hue        !== 0)   m = multiply(hueRotateMatrix(adj.hue), m);
    return m.join(' ');
}

/** True when all adjustments are at identity — filter can be skipped entirely */
export function isIdentityAdjustment(adj: Adjustments): boolean {
    return adj.brightness === 1.0 && adj.contrast === 1.0 &&
           adj.saturation === 1.0 && adj.hue === 0;
}
