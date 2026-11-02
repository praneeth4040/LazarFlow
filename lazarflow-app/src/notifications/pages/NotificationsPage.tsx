import React, { useEffect, useCallback, useState, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CheckCircle, XCircle, Trash2, ChevronRight, Clock, Upload, Brain, Check, X, ShieldCheck, Megaphone, FlaskConical, Zap, Gift } from 'lucide-react-native';
import { useOcrJobs, OcrJob } from '../../context/OcrJobContext';
import { UserContext } from '../../context/UserContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  navigateForNotification,
  AppNotification,
} from '../../lib/notifications';
import { Theme } from '../../styles/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strip emoji codepoints from displayed text — the notification page stays
// plain even if a sender includes emojis in the stored title/body.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}]/gu;
const stripEmojis = (s: string): string =>
  (s || '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: OcrJob['status'] }) => {
  const config: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    queued:   { label: 'Queued',       bg: '#fef3c7', text: '#92400e', icon: <Clock size={12} color="#92400e" /> },
    uploading:{ label: 'Uploading',    bg: '#eff6ff', text: '#1d4ed8', icon: <Upload size={12} color="#1d4ed8" /> },
    running:  { label: 'Analyzing',    bg: '#eff6ff', text: '#1d4ed8', icon: <Brain size={12} color="#1d4ed8" /> },
    done:     { label: 'Complete',    bg: '#d1fae5', text: '#065f46', icon: <Check size={12} color="#065f46" /> },
    failed:   { label: 'Failed',      bg: '#fee2e2', text: '#991b1b', icon: <X size={12} color="#991b1b" /> },
  };
  const c = config[status] ?? config.queued;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {c.icon}
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
};

interface JobCardProps {
  job: OcrJob;
  onReview: (job: OcrJob) => void;
  onDismiss: (jobId: string) => void;
}

const JobCard = ({ job, onReview, onDismiss }: JobCardProps) => {
  const isInFlight = job.status === 'queued' || job.status === 'running' || job.status === 'uploading';
  const isDone = job.status === 'done';
  const isFailed = job.status === 'failed';

  return (
    <View style={[styles.card, !job.isRead && styles.cardUnread]}>
      {/* Unread dot */}
      {!job.isRead && <View style={styles.unreadDot} />}

      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          {isInFlight ? (
            <ActivityIndicator size="small" color={Theme.colors.accent} />
          ) : isDone ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {job.lobbyName}
          </Text>
          <Text style={styles.cardSubtitle}>
            {job.jobType === 'extract_results' ? 'Result Extraction' : 'Lobby Processing'}
          </Text>
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.cardTime}>{timeAgo(job.submittedAt)}</Text>
          <TouchableOpacity onPress={() => onDismiss(job.jobId)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Trash2 size={16} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <StatusBadge status={job.status} />

      {isFailed && job.error && (
        <Text style={styles.errorText} numberOfLines={2}>{job.error}</Text>
      )}

      {isDone && (
        <TouchableOpacity style={styles.reviewBtn} onPress={() => onReview(job)}>
          <Text style={styles.reviewBtnText}>
            {job.jobType === 'extract_results' ? 'Review & Map Results' : 'View Slot Mapping'}
          </Text>
          <ChevronRight size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {isInFlight && (
        <View style={styles.inFlightHint}>
          <Bell size={14} color={Theme.colors.accent} />
          <Text style={{ color: Theme.colors.accent, fontSize: 12 }}>
            You'll be notified when complete — safe to leave this screen
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Static local promotions ──────────────────────────────────────────────────
// These are injected client-side for free-tier users and never touch Supabase.
// When the backend is ready to serve promotions as real notification rows,
// move them there and remove this block. The `isLocal: true` flag keeps every
// Supabase operation (markRead, markAllRead, clearRead) from touching them.
//
// Shape intentionally matches AppNotification so the same NotificationCard
// and iconFor() pipeline renders them without any special-casing in the JSX.

type LocalPromo = AppNotification & { isLocal: true };

const STATIC_PROMOS: LocalPromo[] = [
  {
    id: 'local_promo_weekly_premium',
    title: 'A week of Premium. On the house.',
    body: 'Unlock unlimited AI extractions for 7 days — no upgrade needed.',
    kind: 'promo_offer',
    channel: 'in_app',
    status: 'sent',
    source: 'promo',
    read_at: null,
    // Fixed timestamp so the card doesn't flicker "Just now" on every re-render
    created_at: '2026-10-31T00:00:00.000Z',
    data: {},
    isLocal: true,
  } as LocalPromo,
];

// ─── In-app / push message cards ──────────────────────────────────────────────

// Category chip: who sent it — admin/bot → ADMIN, automation → SYSTEM, self → TEST, promo → OFFER
const SourceChip = ({ source, kind }: { source: string; kind?: string }) => {
  // Promotions get their own label so users know it's an offer, not system noise.
  if (kind === 'promo_offer') {
    return (
      <View style={[styles.sourceChip, { backgroundColor: Theme.colors.accent + '20' }]}>
        <Text style={[styles.sourceChipText, { color: Theme.colors.accent }]}>OFFER</Text>
      </View>
    );
  }
  // kind refines sender-based classification: non-admin kinds from any
  // sender are automation output, shown as SYSTEM.
  const isSystem = source === 'system' || (!!kind && kind !== 'general' && kind !== 'admin_message');
  const isTest = source === 'user';
  const label = isSystem ? 'SYSTEM' : isTest ? 'TEST' : 'ADMIN';
  const bg = isSystem ? Theme.colors.border : Theme.colors.accent + '22';
  const color = isSystem ? Theme.colors.textSecondary : Theme.colors.accent;
  return (
    <View style={[styles.sourceChip, { backgroundColor: bg }]}>
      <Text style={[styles.sourceChipText, { color }]}>{label}</Text>
    </View>
  );
};

// Dynamic icon: reflects WHAT the notification is about, not just its channel.
const iconFor = (n: AppNotification): React.ReactNode => {
  // A push that actually failed always shows red, whatever its kind.
  if (n.channel !== 'in_app' && n.status === 'failed') {
    return <XCircle size={20} color="#ef4444" />;
  }
  switch (n.kind) {
    case 'job_complete':   return <CheckCircle size={20} color="#10b981" />;
    case 'job_failed':     return <XCircle size={20} color="#ef4444" />;
    case 'admin_message':  return <ShieldCheck size={20} color="#3b82f6" />;
    case 'broadcast':      return <Megaphone size={20} color="#f59e0b" />;
    case 'test':           return <FlaskConical size={20} color="#8b5cf6" />;
    case 'promo_offer':    return <Gift size={20} color={Theme.colors.accent} />;
  }
  if (n.source === 'system') return <Zap size={20} color="#64748b" />;
  return <Bell size={20} color={Theme.colors.accent} />;
};

const NotificationCard = ({ n, onTap }: { n: AppNotification; onTap: (n: AppNotification) => void }) => {
  const isUnread = !n.read_at;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={() => onTap(n)}
      activeOpacity={0.7}
    >
      {isUnread && <View style={styles.unreadDot} />}

      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>{iconFor(n)}</View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {stripEmojis(n.title)}
          </Text>
          <View style={styles.subtitleRow}>
            <SourceChip source={n.source} kind={n.kind} />
          </View>
        </View>
        <Text style={styles.cardTime}>{timeAgo(n.created_at)}</Text>
      </View>

      <Text style={styles.messageBody} numberOfLines={3}>
        {stripEmojis(n.body)}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const NotificationsPage = ({ navigation }: any) => {
  const { jobs, markAllRead, dismissJob } = useOcrJobs();
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimedPromo, setClaimedPromo] = useState(false);

  // Check persisted claimed status whenever screen gains focus or user changes
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      AsyncStorage.getItem(`@claimed_promo_free_weekly_${user.id}`).then((val) => {
        if (val === 'true') {
          setClaimedPromo(true);
        }
      });
    }, [user?.id])
  );

  // Load the user's notifications. Unread rows STAY unread until the user
  // explicitly taps a card or "Mark all read" — no auto-marking on open.
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await fetchNotifications(user.id);
      setMessages(rows);
    } catch {
      // leave whatever we have — the section just stays as-is
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTapMessage = useCallback(
    async (n: AppNotification) => {
      // Local synthetic entries never touch Supabase — just navigate directly.
      if ((n as any).isLocal) {
        if (n.kind === 'promo_offer') navigation.navigate('PromoOffer');
        return;
      }
      // Mark read first (as before)
      if (!n.read_at && user?.id) {
        setMessages((prev: AppNotification[]) =>
          prev.map((r: AppNotification) => (r.id === n.id ? { ...r, read_at: new Date().toISOString() } : r)),
        );
        try {
          await markNotificationRead(n.id, user.id);
        } catch {
          // RLS/network hiccup — the row stays unread server-side; refetch will correct
        }
      }
      // Navigate ONLY when the notification carries a routing target — job
      // results go to the review screen; generic messages don't navigate.
      await navigateForNotification(navigation.navigate, n.data);
    },
    [user?.id, navigation],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Inject static promos at the top for free-tier users who haven't claimed yet.
  // Once claimed or under an active subscription, promos disappear entirely.
  // All Supabase operations (mark read, clear) work only on `messages` state,
  // so real notifications are completely unaffected.
  const hasActiveSub =
    user?.subscription_expires_at &&
    new Date(user.subscription_expires_at) > new Date() &&
    user?.subscription_tier !== 'free';

  const shouldHidePromo = hasActiveSub || claimedPromo;

  const displayMessages: AppNotification[] = shouldHidePromo
    ? messages
    : [...STATIC_PROMOS, ...messages];

  // Unread count: local promos are always "unread" visually but must not
  // inflate the "Mark all read" badge — exclude them from the count.
  const unreadMessages = messages.filter(n => !n.read_at).length;

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id || unreadMessages === 0) return;
    const now = new Date().toISOString();
    setMessages((prev: AppNotification[]) =>
      prev.map((r: AppNotification) => ({ ...r, read_at: r.read_at ?? now })),
    );
    try {
      await markAllNotificationsRead(user.id);
    } catch {
      // server-side stamp failed — local state already shows read; refetch will correct
    }
  }, [user?.id, unreadMessages]);

  const handleClearRead = useCallback(() => {
    if (!user?.id || !messages.some(n => n.read_at)) return;
    Alert.alert(
      'Clear read notifications',
      'Read messages will be removed. Unread ones stay so you don\'t miss them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearReadNotifications(user.id);
              setMessages((prev: AppNotification[]) => prev.filter((r: AppNotification) => !r.read_at));
            } catch {
              // refetch will show the truth
            }
          },
        },
      ],
    );
  }, [user?.id, messages]);

  // Mark all jobs as read when page opens (existing behavior)
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const handleReview = useCallback(
    (job: OcrJob) => {
      // Navigate to CalculateResults — the hook will restore the done state from context
      navigation.navigate('CalculateResults', {
        lobby: { id: job.lobbyId, name: job.lobbyName },
        initialMode: 'ai',
      });
    },
    [navigation],
  );

  const inFlight = jobs.filter(
    j => j.status === 'queued' || j.status === 'running' || j.status === 'uploading',
  );
  const completed = jobs.filter(j => j.status === 'done' || j.status === 'failed');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadMessages > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <Check size={14} color={Theme.colors.accent} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClearRead} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <Trash2 size={16} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />
        }
      >
        {jobs.length === 0 && messages.length === 0 && loading && (
          <ActivityIndicator style={{ marginTop: 60 }} color={Theme.colors.accent} />
        )}

        {jobs.length === 0 && displayMessages.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Bell size={48} color={Theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              Updates and messages will appear here.
            </Text>
          </View>
        )}

        {displayMessages.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>MESSAGES</Text>
            {displayMessages.map(n => (
              <NotificationCard key={n.id} n={n} onTap={handleTapMessage} />
            ))}
          </>
        )}

        {inFlight.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>IN PROGRESS</Text>
            {inFlight.map(job => (
              <JobCard
                key={job.jobId}
                job={job}
                onReview={handleReview}
                onDismiss={dismissJob}
              />
            ))}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>COMPLETED</Text>
            {completed.map(job => (
              <JobCard
                key={job.jobId}
                job={job}
                onReview={handleReview}
                onDismiss={dismissJob}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.textPrimary,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Theme.colors.accent + '15',
  },
  markAllText: {
    fontSize: 12,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.accent,
  },
  clearBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sourceChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sourceChipText: {
    fontSize: 9,
    fontFamily: Theme.fonts.outfit.bold,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: Theme.colors.secondary,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    position: 'relative',
  },
  cardUnread: {
    borderColor: Theme.colors.accent + '40',
    backgroundColor: Theme.colors.accent + '08',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.outfit.regular,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  cardMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTime: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.fonts.outfit.regular,
  },
  messageBody: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.fonts.outfit.regular,
    lineHeight: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.outfit.medium,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontFamily: Theme.fonts.outfit.regular,
    lineHeight: 17,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Theme.fonts.outfit.bold,
  },
  inFlightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.outfit.bold,
    color: Theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.fonts.outfit.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});

export default NotificationsPage;
