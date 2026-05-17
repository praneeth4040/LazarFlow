import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CheckCircle, XCircle, Trash2, ChevronRight, Clock, Upload, Brain, Check, X } from 'lucide-react-native';
import { useOcrJobs, OcrJob } from '../../context/OcrJobContext';
import { Theme } from '../../styles/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

const NotificationsPage = ({ navigation }: any) => {
  const { jobs, markAllRead, dismissJob } = useOcrJobs();

  // Mark all as read when page opens
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
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {jobs.length === 0 && (
          <View style={styles.emptyState}>
            <Bell size={48} color={Theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When you submit AI extraction jobs, they'll appear here.
            </Text>
          </View>
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
