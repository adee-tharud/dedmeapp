/**
 * Message Detail screen — /message/[id]
 *
 * Displays decrypted message details, recipient metadata, encryption status,
 * and management actions (Activate draft / Delete draft).
 *
 * Security:
 * - Decryption is performed client-side using device hardware key.
 * - Sensitive message body is never logged or exposed.
 * - Access gated to the authenticated message owner via RLS & session check.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useMessage, useActivateMessage, useDeleteMessage } from '@/features/messages';
import { avatarInitial, formatRelativeDate } from '@/utils';
import { Button } from '@/components/ui/Button';

// ── Status configurations ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  'draft' | 'active' | 'sent',
  { bg: string; text: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  active: {
    bg: '#E6F9EE',
    text: '#1A8A47',
    label: 'ACTIVE',
    icon: 'shield-checkmark',
  },
  draft: {
    bg: '#F1F5F9',
    text: '#64748B',
    label: 'DRAFT',
    icon: 'document-text-outline',
  },
  sent: {
    bg: '#E8F0FE',
    text: '#1A56DB',
    label: 'SENT',
    icon: 'paper-plane',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Queries & Mutations
  const {
    data: message,
    isLoading,
    isError,
    error,
    refetch,
  } = useMessage(id ?? '', userId);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const activateMutation = useActivateMessage(userId);
  const deleteMutation = useDeleteMessage(userId);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleCopyBody = async () => {
    if (!message?.body) return;
    try {
      await Clipboard.setStringAsync(message.body);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Graceful fallback
    }
  };

  const handleActivate = () => {
    if (!id || !message) return;

    Alert.alert(
      'Activate Message',
      `Are you sure you want to activate this message for ${message.recipient_name}? It will be scheduled for delivery if your check-in ever lapses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'default',
          onPress: () => {
            activateMutation.mutate(id, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
              onError: (err) => {
                Alert.alert('Activation Failed', err.message || 'Please try again.');
              },
            });
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!id || !message) return;

    Alert.alert(
      'Delete Draft',
      'Are you sure you want to permanently delete this draft message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(id, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                router.replace('/(tabs)/messages');
              },
              onError: (err) => {
                Alert.alert('Deletion Failed', err.message || 'Please try again.');
              },
            });
          },
        },
      ],
    );
  };

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brand[600]} />
          <Text style={styles.loadingText}>Decrypting message securely…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (isError || !message) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.brand[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Message</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Message not found</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'The message could not be loaded.'}
          </Text>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={() => router.replace('/(tabs)/messages')}
          >
            <Text style={styles.actionBtnSecondaryText}>Back to Messages</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[message.status] ?? STATUS_CONFIG.draft;
  const isFailedDecryption = message.body === '[Message could not be decrypted]';
  const timingDescription =
    message.timing_type === 'full_plan'
      ? 'Delivered after the full check-in plan expires.'
      : message.timing_type === 'wait_longer'
        ? 'Delivered after an extended waiting period.'
        : 'Delivered upon emergency escalation.';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.brand[900]} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Secret Message</Text>

        {/* Status Badge */}
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={13} color={status.text} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand[600]}
          />
        }
      >
        {/* ── Recipient Hero Card ────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial(message.recipient_name)}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.recipientName}>For {message.recipient_name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={14} color={colors.grey[500]} />
              <Text style={styles.metaText}>{message.recipient_email}</Text>
            </View>
            {message.recipient_phone ? (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={colors.grey[500]} />
                <Text style={styles.metaText}>{message.recipient_phone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Delivery Timing Info ────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="time-outline" size={18} color={colors.brand[600]} />
            <Text style={styles.infoCardTitle}>Delivery Condition</Text>
          </View>
          <Text style={styles.infoCardBody}>{timingDescription}</Text>
          <Text style={styles.timestampText}>
            {formatRelativeDate(message.updated_at)} • Created{' '}
            {new Date(message.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* ── Encryption Guarantee ────────────────────────────────────────── */}
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#00838F" />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Dual-Envelope Encryption Active</Text>
            <Text style={styles.securityText}>
              Decrypted securely on this device with your private key. Posthumous
              delivery is sealed with the escrow public key.
            </Text>
          </View>
        </View>

        {/* ── Decrypted Message Body ──────────────────────────────────────── */}
        <View style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageHeaderTitle}>Message Body</Text>
            {!isFailedDecryption && (
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleCopyBody}
                accessibilityRole="button"
                accessibilityLabel="Copy message text"
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copied ? colors.success : colors.brand[600]}
                />
                <Text style={[styles.copyText, copied && { color: colors.success }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isFailedDecryption ? (
            <View style={styles.decryptionErrorBox}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.danger} />
              <Text style={styles.decryptionErrorText}>
                This message was encrypted with a device key not found in this phone&apos;s
                SecureStore. It cannot be decrypted on this device.
              </Text>
            </View>
          ) : (
            <Text style={styles.messageBodyText}>{message.body}</Text>
          )}
        </View>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {message.status === 'draft' ? (
          <View style={styles.actionsContainer}>
            <Button
              label={activateMutation.isPending ? 'Activating…' : 'Activate Message'}
              onPress={handleActivate}
              loading={activateMutation.isPending}
              disabled={activateMutation.isPending || deleteMutation.isPending}
            />

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={activateMutation.isPending || deleteMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Delete draft message"
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.deleteBtnText}>Delete Draft</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeNotice}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.activeNoticeText}>
              This message is active and armed for posthumous delivery.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sky.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.brand[800],
    fontWeight: fontWeights.medium,
  },
  errorTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.grey[900],
    marginTop: spacing[2],
  },
  errorSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.5,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },
  heroInfo: {
    flex: 1,
    gap: spacing[1],
  },
  recipientName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaText: {
    fontSize: fontSizes.sm,
    color: colors.grey[600],
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.grey[200],
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoCardTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  infoCardBody: {
    fontSize: fontSizes.sm,
    color: colors.grey[700],
    lineHeight: fontSizes.sm * 1.45,
  },
  timestampText: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
    marginTop: spacing[1],
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: '#E0F7FA',
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  securityTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: '#006064',
    marginBottom: 2,
  },
  securityText: {
    fontSize: fontSizes.xs,
    color: '#00838F',
    lineHeight: fontSizes.xs * 1.5,
  },
  messageCard: {
    backgroundColor: colors.white,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    gap: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100],
    paddingBottom: spacing[3],
  },
  messageHeaderTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.brand[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  copyText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.brand[600],
  },
  messageBodyText: {
    fontSize: fontSizes.md,
    color: colors.grey[800],
    lineHeight: fontSizes.md * 1.6,
  },
  decryptionErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: '#FEF2F2',
    padding: spacing[4],
    borderRadius: radii.lg,
  },
  decryptionErrorText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.danger,
    lineHeight: fontSizes.sm * 1.4,
  },
  actionsContainer: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },
  actionBtnSecondary: {
    marginTop: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: colors.brand[600],
    borderRadius: radii.xl,
  },
  actionBtnSecondaryText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  activeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: '#E6F9EE',
    padding: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#C3EEDB',
    marginTop: spacing[2],
  },
  activeNoticeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: '#1A8A47',
  },
});
