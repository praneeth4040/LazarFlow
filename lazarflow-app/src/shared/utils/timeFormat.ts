/**
 * timeFormat.ts — helpers for schedule-card time fields.
 *
 * Times are stored as display strings ("11:45 AM" or "23:45"); these helpers
 * convert between the picker's 24-hour hour/minute pair and the user's chosen
 * display style, and re-format stored values when the style is toggled.
 */

export function formatTime(hour24: number, minute: number, use24Hour: boolean): string {
    const mm = String(minute).padStart(2, '0');
    if (use24Hour) return `${String(hour24).padStart(2, '0')}:${mm}`;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${h12}:${mm} ${period}`;
}

export function parseTimeDisplay(value: string | undefined | null): { hour24: number; minute: number } | null {
    if (!value) return null;
    const m = /^(\d{1,2})[:.](\d{2})\s*(AM|PM|am|pm)?$/.exec(value.trim());
    if (!m) return null;
    let hour24 = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const period = m[3]?.toUpperCase();
    if (minute > 59 || hour24 < 0 || hour24 > 24) return null;
    if (period) {
        if (hour24 < 1 || hour24 > 12) return null;
        const base = hour24 % 12;
        hour24 = period === 'PM' ? base + 12 : base;
    }
    return { hour24: hour24 % 24, minute };
}

/** Re-format a stored display string into the given style; returns as-is if unparseable. */
export function reformatTime(value: string | undefined, use24Hour: boolean): string | undefined {
    const parsed = parseTimeDisplay(value);
    return parsed ? formatTime(parsed.hour24, parsed.minute, use24Hour) : value;
}
