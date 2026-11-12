/**
 * renderTypes.ts — Registry of render types (what the render engine can produce).
 *
 * Single source of truth for every screen that deals with themed renders:
 * gallery filter chips, lobby render segments, per-type theme selection, and
 * the field schema each type's templates are mapped against.
 *
 * Adding a new render type = one entry here (+ backend renderer support).
 */
import React from 'react';
import { BarChart3, Medal, ListOrdered, Megaphone } from 'lucide-react-native';

export type RenderTypeId = 'points_table' | 'mvp' | 'slotlist' | 'schedule';

export interface RenderFieldDef {
    /** Field key used in mapping_config cells / extra_fields */
    key: string;
    /** Human label shown in the UI */
    label: string;
    /** Dummy value used for previews */
    sample: string;
    /** 'time' fields open a time picker instead of free-text input */
    kind?: 'text' | 'time';
}

export interface RenderTypeDef {
    id: RenderTypeId;
    /** Tab / chip label */
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    /** What one rendered row represents ('Card' for single-card types) */
    rowLabel: string;
    /**
     * Field schema. For row-based types this describes one row (mapping_config
     * cells); for card types like 'schedule' it describes the card's text
     * overlays (mapping_config extra_fields).
     */
    fields: RenderFieldDef[];
    /** Extra input the user must provide before rendering */
    preRender?: 'schedule-form';
}

export const DEFAULT_RENDER_TYPE_ID: RenderTypeId = 'points_table';

export const RENDER_TYPES: RenderTypeDef[] = [
    {
        id: 'points_table',
        label: 'Standings',
        icon: BarChart3,
        rowLabel: 'Team',
        fields: [
            { key: 'rank', label: 'Rank', sample: '1' },
            { key: 'team', label: 'Team', sample: 'Thunder Hawks' },
            { key: 'w', label: 'Wins', sample: '18' },
            { key: 'pp', label: 'Placement', sample: '182' },
            { key: 'kp', label: 'Kills', sample: '246' },
            { key: 'mp', label: 'Matches', sample: '6' },
            { key: 'total', label: 'Total', sample: '428' },
        ],
    },
    {
        id: 'mvp',
        label: 'MVP',
        icon: Medal,
        rowLabel: 'Player',
        fields: [
            { key: 'rank', label: 'Rank', sample: '1' },
            { key: 'player', label: 'Player', sample: 'SnaxGaming' },
            { key: 'team', label: 'Team', sample: 'Thunder Hawks' },
            { key: 'kills', label: 'Kills', sample: '23' },
            { key: 'mp', label: 'Matches', sample: '6' },
        ],
    },
    {
        id: 'slotlist',
        label: 'Slots',
        icon: ListOrdered,
        rowLabel: 'Slot',
        fields: [
            { key: 'slot', label: 'Slot', sample: '1' },
            { key: 'team', label: 'Team', sample: 'Thunder Hawks' },
        ],
    },
    {
        id: 'schedule',
        label: 'Schedule',
        icon: Megaphone,
        rowLabel: 'Card',
        preRender: 'schedule-form',
        fields: [
            { key: 'title', label: 'Title', sample: '12PM PRACTICE SCRIMS' },
            { key: 'idp_time', label: 'ID Pass Time', sample: '11:45 AM', kind: 'time' },
            { key: 'start_time', label: 'Start Time', sample: '12:00 PM', kind: 'time' },
        ],
    },
];

const RENDER_TYPE_MAP: Record<string, RenderTypeDef> = Object.fromEntries(
    RENDER_TYPES.map(rt => [rt.id, rt])
);

/** Look up a render type by id; undefined for unknown ids. */
export const getRenderType = (id: string): RenderTypeDef | undefined =>
    RENDER_TYPE_MAP[id];
