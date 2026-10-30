/**
 * Unread in-app/push notification count for the bell badge.
 * Polls on an interval (cheap head-count query) and refetches on demand.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchUnreadCount } from '../lib/notifications';

export const useNotificationsUnread = (userId, pollMs = 30000) => {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        if (!userId) {
            setCount(0);
            return;
        }
        try {
            setCount(await fetchUnreadCount(userId));
        } catch {
            // badge is best-effort — never surface errors from it
        }
    }, [userId]);

    useEffect(() => {
        refresh();
        if (!pollMs) return;
        const timer = setInterval(refresh, pollMs);
        return () => clearInterval(timer);
    }, [refresh, pollMs]);

    return { unreadCount: count, refreshUnread: refresh };
};
