import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Button } from '@/components/ui/Button';
import { useDraftStore, useCreateMessage } from '@/features/messages';
import { useAuth } from '@/features/auth/AuthContext';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '@/theme/tokens';

function ReviewRow({
  sectionLabel,
  value,
  subValue,
  onEdit,
}: {
  sectionLabel: string;
  value: string;
  subValue?: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewLabel}>{sectionLabel}</Text>
        <TouchableOpacity onPress={onEdit} accessibilityLabel={`Edit ${sectionLabel}`} accessibilityRole="button">
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.reviewValue}>{value}</Text>
      {subValue ? <Text style={styles.reviewSubValue}>{subValue}</Text> : null}
    </View>
  );
}

export default function Step4Screen() {
  const { recipientName, recipientEmail, recipientPhone, body, timing, confirmed, setConfirmed, reset } = useDraftStore();
  const { user } = useAuth();

  // ✅ Hook handles encryption, Supabase insert, and cache invalidation
  const createMessage = useCreateMessage(user?.id ?? '');

  const timingLabel =
    timing === 'full_plan' ? 'After the full check-in plan' : 'After a longer wait';

  const bodyPreview =
    body.length > 60 ? `"${body.slice(0, 60)}…"` : `"${body}"`;

  const handleActivate = () => {
    if (!user) return;
    createMessage.mutate(
      {
        userId:         user.id,
        recipientName,
        recipientEmail,
        recipientPhone: recipientPhone || undefined,
        body,
        timingType:     timing,
      },
      {
        onSuccess: () => {
          reset(); // clear draft store only after successful save
          router.replace('/message/new/step-5');
        },
        onError: (err) => {
          console.error('[Step4] createMessage failed:', err);
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color={colors.brand[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New secret message</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stepRow}>
        <StepIndicator total={4} current={3} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>STEP 4 OF 4</Text>
        <Text style={styles.title}>Review carefully</Text>

        {/* ── Review cards ──────────────────────────────────────────────────  */}
        <View style={styles.reviewList}>
          <ReviewRow
            sectionLabel="RECIPIENT"
            value={recipientName}
            subValue={recipientEmail}
            onEdit={() => router.push('/message/new/step-1')}
          />
          <ReviewRow
            sectionLabel="MESSAGE"
            value={bodyPreview}
            onEdit={() => router.push('/message/new/step-2')}
          />
          <ReviewRow
            sectionLabel="SEND TIMING"
            value={timingLabel}
            onEdit={() => router.push('/message/new/step-3')}
          />
        </View>

        {/* ── Confirmation checkbox ─────────────────────────────────────────  */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          accessibilityLabel="I understand this message cannot be recalled once sent"
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked,]}>
            {confirmed && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <Text style={styles.checkboxText}>
            I understand that once this message is sent,{' '}
            <Text style={styles.checkboxBold}>it can&apos;t be recalled.</Text>
          </Text>
        </TouchableOpacity>

        {/* ── Error banner ──────────────────────────────────────────────────  */}
        {createMessage.isError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.surface.dangerText} />
            <Text style={styles.errorText}>Could not save your message. Please try again.</Text>
          </View>
        ) : null}

        <View style={styles.spacer} />

        {/* ── Activate button ───────────────────────────────────────────────  */}
        {createMessage.isPending ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color={colors.brand[700]} />
            <Text style={styles.savingText}>Encrypting and saving…</Text>
          </View>
        ) : (
          <Button
            label="Save and activate"
            onPress={handleActivate}
            disabled={!confirmed || createMessage.isPending}
            style={[styles.activateBtn, !confirmed && styles.activateBtnDisabled]}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    ...shadows.subtle,
  },
  headerTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  stepRow: { alignItems: 'center', paddingBottom: spacing[4] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing[6], paddingBottom: spacing[6], gap: spacing[4], flexGrow: 1 },
  stepLabel: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.brand[600], letterSpacing: 1 },
  title: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.extrabold, color: colors.brand[900], letterSpacing: -0.6, marginTop: -spacing[2] },

  reviewList: { gap: spacing[3] },
  reviewCard: {
    backgroundColor: colors.white, borderRadius: radii.xl,
    borderWidth: 1.5, borderColor: colors.grey[200], padding: spacing[5], gap: spacing[1],
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewLabel: { fontSize: 11, fontWeight: fontWeights.bold, color: colors.grey[400], letterSpacing: 0.6 },
  editText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.brand[600] },
  reviewValue: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  reviewSubValue: { fontSize: fontSizes.sm, color: colors.grey[500] },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4],
    backgroundColor: colors.white, borderRadius: radii.xl,
    borderWidth: 1.5, borderColor: colors.grey[200], padding: spacing[5],
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: colors.grey[300], alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  checkboxText: { flex: 1, fontSize: fontSizes.sm, color: colors.grey[600], lineHeight: fontSizes.sm * 1.55 },
  checkboxBold: { fontWeight: fontWeights.bold, color: colors.brand[900] },

  spacer: { flex: 1, minHeight: spacing[6] },
  activateBtn: { borderRadius: radii.full },
  activateBtnDisabled: { opacity: 0.45 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.surface.dangerSubtle, borderRadius: radii.lg,
    padding: spacing[3], borderWidth: 1, borderColor: colors.surface.dangerBorderSubtle,
  },
  errorText: { flex: 1, color: colors.surface.dangerText, fontSize: fontSizes.sm },
  savingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[3], paddingVertical: spacing[4],
  },
  savingText: { color: colors.brand[700], fontWeight: fontWeights.medium, fontSize: fontSizes.md },
});
