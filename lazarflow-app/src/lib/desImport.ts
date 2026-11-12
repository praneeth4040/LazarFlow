/**
 * desImport.ts — frontend service for the .des import wizard.
 *
 * Talks to the LazarFlow-backend /api/des/import endpoint
 * (service/routes/des.py), which does decode → mapping_config conversion →
 * demo preview in one call:
 *   - `createTheme=false` (dry run): decode + convert + render a demo
 *     preview. Nothing is stored — used for wizard step 2.
 *   - `createTheme=true`: stores the background in the themes bucket and
 *     creates the theme row with the requested status — wizard step 3.
 *     `status=pending` fires the admin review email; `status=verified`
 *     makes the theme immediately renderable.
 * All routes take multipart form data; auth rides on apiClient's JWT
 * interceptor. Backend error details arrive as {message, code}.
 */

import apiClient from './apiClient';
import * as FileSystem from 'expo-file-system/legacy';

/** Matches MAX_DES_BYTES on the backend (decoder.py). */
export const MAX_DES_BYTES = 64 * 1024 * 1024;

export type DesImportErrorCode =
    | 'INVALID_EXTENSION'
    | 'FILE_TOO_LARGE'
    | 'READ_FAILED'
    | 'NETWORK'                 // request never reached the backend
    | 'INVALID_DES_FILE'        // backend: EMPTY_DES_FILE / INVALID_DES_FILE
    | 'UNSUPPORTED_DES_MODEL'   // backend: 400 — non-standings models (slotlist etc.)
    | 'IMPORT_FAILED';          // backend: 503 THEME_CREATE_FAILED or unknown

export type DesImportStatus = 'pending' | 'verified';

export class DesImportError extends Error {
    code: DesImportErrorCode;

    constructor(code: DesImportErrorCode, message: string) {
        super(message);
        this.code = code;
        this.name = 'DesImportError';
    }
}

/** A .des file staged for import, always a file:// URI inside the app cache. */
export interface DesFileInfo {
    /** Original file name (or a fallback derived from the URI). */
    name: string;
    /** Size in bytes; 0 means unknown (content:// open-with path). */
    size: number;
    /** file:// URI readable by FormData / expo-file-system. */
    uri: string;
}

export interface DesImportAudit {
    unknown_count: number;
    unknown_keys: string[];
}

/** Step-2 result: decoded config + demo render, nothing stored server-side. */
export interface DesPreviewResult {
    /** Name the backend resolved (designFileName → clanName → file stem). */
    name: string;
    mappingConfig: Record<string, any>;
    audit: DesImportAudit;
    image: { size_bytes: number; is_png: boolean; width?: number; height?: number };
    /** Demo render (data:image/jpeg;base64,...) — null if preview failed. */
    preview: string | null;
}

/** Step-3 result: the created theme row. */
export interface DesImportResult {
    themeId: string;
    imageUrl: string | null;
    name: string;
    status: DesImportStatus;
}

/** True if the file name looks like a .des design file. */
export const hasDesExtension = (name: string): boolean =>
    /\.des$/i.test((name || '').trim());

/** Throws DesImportError when the file can't possibly be a valid .des upload. */
export const validateDesFile = (name: string, size: number): void => {
    if (!hasDesExtension(name)) {
        throw new DesImportError('INVALID_EXTENSION', `"${name}" is not a .des design file`);
    }
    if (size > MAX_DES_BYTES) {
        throw new DesImportError('FILE_TOO_LARGE', 'Design files must be under 64 MB');
    }
};

/**
 * Normalize a picked/opened URI into a cache-resident file:// upload.
 *
 * DocumentPicker (copyToCacheDirectory) already yields file:// URIs; the
 * open-with intent path yields content:// URIs which FormData can't read,
 * so those get copied through base64 into our cache first.
 */
export const prepareDesFile = async (uri: string, fallbackName?: string): Promise<DesFileInfo> => {
    try {
        if (uri.startsWith('file://')) {
            const name = fallbackName || uri.split('/').pop() || 'design.des';
            let size = 0;
            try {
                const info = await FileSystem.getInfoAsync(uri);
                if (info.exists && typeof info.size === 'number') size = info.size;
            } catch {
                // size stays unknown — not fatal
            }
            validateDesFile(name, size);
            return { name, size, uri };
        }

        // content:// (or anything else) — read + copy into cache
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const name = fallbackName || 'design.des';
        validateDesFile(name, 0);
        const dest = `${FileSystem.cacheDirectory}des-import-${Date.now()}.des`;
        await FileSystem.writeAsStringAsync(dest, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return { name, size: 0, uri: dest };
    } catch (err) {
        if (err instanceof DesImportError) throw err;
        console.warn('📎 [desImport] Could not read design file:', err);
        throw new DesImportError('READ_FAILED', 'Could not read the selected design file');
    }
};

/**
 * Map a backend /api/des error (HTTPException detail: {message, code}) to a
 * typed DesImportError with the user-facing message kept in the hook.
 */
const mapDesApiError = (err: any, fallbackCode: DesImportErrorCode): DesImportError => {
    // No HTTP response at all → transport failure, not a file problem
    if (!err?.response) {
        return new DesImportError('NETWORK', err?.message || 'Network request failed');
    }
    const detail = err?.response?.data?.detail;
    const code = typeof detail === 'object' ? detail?.code : undefined;
    const message = (typeof detail === 'object' ? detail?.message : detail)
        || err?.message
        || 'Import failed';

    switch (code) {
        case 'UNSUPPORTED_DES_MODEL':
            return new DesImportError('UNSUPPORTED_DES_MODEL', message);
        case 'DES_TOO_LARGE':
            return new DesImportError('FILE_TOO_LARGE', message);
        case 'EMPTY_DES_FILE':
        case 'INVALID_DES_FILE':
            return new DesImportError('INVALID_DES_FILE', message);
        default:
            return new DesImportError(fallbackCode, message);
    }
};

const buildFormData = (file: DesFileInfo, fields: Record<string, string>): FormData => {
    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/octet-stream',
    } as any);
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    return formData;
};

/**
 * One immediate retry for fast transport-level failures. Stale keep-alive
 * sockets (emulator NAT / server idle close) kill the FIRST request on a
 * reused connection in ~100-200ms — before any bytes reach the server —
 * while the retry on a fresh socket succeeds. A sub-second network error
 * therefore means nothing was created, making one retry safe even for the
 * non-idempotent confirm call. Slow failures stay ambiguous and are NOT
 * retried (surface to the user instead).
 */
const withTransportRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
        return await fn();
    } catch (err: any) {
        const msg = `${err?.message || ''}`.toLowerCase();
        if (!err?.response && msg.includes('network')) {
            console.warn('📎 [desImport] Transport failure on reused socket — retrying once…');
            await new Promise(r => setTimeout(r, 400));
            return await fn();
        }
        throw err;
    }
};

/**
 * Wizard step 2 — decode the file, convert to mapping_config and render a
 * demo preview through the production pipeline. Dry run: nothing is stored.
 * Backend: POST /api/des/import (createTheme=false, preview=true).
 */
export const previewDesImport = async (file: DesFileInfo, name?: string): Promise<DesPreviewResult> => {
    try {
        const fields: Record<string, string> = { createTheme: 'false', preview: 'true' };
        if (name?.trim()) fields.name = name.trim();
        const { data } = await withTransportRetry(() => apiClient.post(
            '/api/des/import',
            buildFormData(file, fields),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        ));
        return {
            name: data.name || file.name,
            mappingConfig: data.mapping_config || {},
            audit: data.audit || { unknown_count: 0, unknown_keys: [] },
            image: data.image || { size_bytes: 0, is_png: false },
            preview: data.preview || null,
        };
    } catch (err) {
        console.warn('📎 [desImport] Preview failed:', err?.response?.data || err);
        throw mapDesApiError(err, 'INVALID_DES_FILE');
    }
};

/**
 * Wizard step 3 — create the theme with the user's review outcome.
 * `verified` is render-ready immediately; `pending` goes to admin review
 * (backend fires the admin email alert).
 * Backend: POST /api/des/import (createTheme=true, preview=false, status).
 */
export const confirmDesImport = async (
    file: DesFileInfo,
    name: string | undefined,
    status: DesImportStatus,
): Promise<DesImportResult> => {
    try {
        const fields: Record<string, string> = { createTheme: 'true', preview: 'false', status };
        if (name?.trim()) fields.name = name.trim();
        const { data } = await withTransportRetry(() => apiClient.post(
            '/api/des/import',
            buildFormData(file, fields),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        ));
        if (!data.theme_id) {
            throw new DesImportError('IMPORT_FAILED', 'Creating the theme failed. Please try again.');
        }
        return {
            themeId: data.theme_id,
            imageUrl: data.image_url || null,
            name: data.name || name || file.name,
            status,
        };
    } catch (err) {
        if (err instanceof DesImportError) throw err;
        console.warn('📎 [desImport] Import failed:', err?.response?.data || err);
        throw mapDesApiError(err, 'IMPORT_FAILED');
    }
};
