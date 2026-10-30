/**
 * In-app notifications — direct Supabase reads/writes on the `notifications`
 * table. RLS lets each user read/update only their own rows, so no backend
 * endpoints are needed (the table is also written by the backend dispatcher
 * for pushes — both kinds appear here).
 */
import { supabase } from './supabaseClient';
import { getLobby } from './dataService';

/**
 * @typedef {Object} AppNotification
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string} channel    'push' | 'in_app' | 'both'
 * @property {string} status     'sent' | 'delivered' | 'failed'
 * @property {string} source     'admin' | 'bot' | 'system' | 'user'
 * @property {string} kind       'general' | 'admin_message' | 'job_complete' | ...
 * @property {string|null} read_at
 * @property {string} created_at
 * @property {Object} data
 */

/** Fetch the user's notifications, newest first. */
export async function fetchNotifications(userId, limit = 50) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

/** Count unread rows — powers the bell badge. */
export async function fetchUnreadCount(userId) {
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
    if (error) throw error;
    return count || 0;
}

/** Stamp one notification as read (own rows only — enforced by RLS). */
export async function markNotificationRead(notificationId, userId) {
    const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId);
    if (error) throw error;
}

/** Stamp every unread row as read (used when the page opens). */
export async function markAllNotificationsRead(userId) {
    const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
    if (error) throw error;
}

/** Delete the user's READ notifications (unread ones stay visible). */
export async function clearReadNotifications(userId) {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .not('read_at', 'is', null);
    if (error) throw error;
}

/**
 * Navigate to the right place for a job-result notification.
 * Complete → the CalculateResults review screen (fetches the lobby name first);
 * failed / anything else with a lobby target → the lobby's Live Standings.
 * Returns true if it navigated. Generic messages (no lobby target) → false.
 */
export async function navigateForNotification(navigate, data) {
    if (!data?.lobby_id) return false;
    if (data.type === 'ocr_job_complete') {
        try {
            const lobby = await getLobby(data.lobby_id);
            navigate('CalculateResults', {
                lobby: { id: data.lobby_id, name: lobby?.name || '' },
                initialMode: 'ai',
            });
            return true;
        } catch {
            // lobby fetch failed — fall back to the lobby page below
        }
    }
    navigate('LiveLobby', { id: data.lobby_id });
    return true;
}
