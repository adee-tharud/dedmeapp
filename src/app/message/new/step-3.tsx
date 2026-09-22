import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StepIndicator } from '../../../components/ui/StepIndicator';
import { Button } from '../../../components/ui/Button';
import { useDraftStore, SendTiming } from '../../../features/messages/useDraftStore';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../../theme/tokens';

const TIMING_OPTIONS: Array<{
  id: SendTiming;
  title: string;
  description: string;
}> = [
  {
    id: 'full_plan',
    title: 'After my full check-in plan',
    description:
      'First we remind you, then ask your caregiver. This sends only if neither step confirms you\'re okay.',
  },
  {
    id: 'longer_wait',
    title: 'Choose a longer wait',
    description:
      'Add an extra 24 or 48 hours after your caregiver is contacted.',
  },
];

export default function Step3Screen() {
  const { timing, setTiming } = useDraftStore();

  const handleContinue = () => router.push('/message/new/step-4');
  const handleSaveDraft = () => router.replace('/(tabs)/messages');

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
        <StepIndicator total={4} current={2} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>STEP 3 OF 4</Text>
        <Text style={styles.title}>When should it send?</Text>

        {/* ── Timing options ────────────────────────────────────────────────  */}
        <View style={styles.options}>
          {TIMING_OPTIONS.map(option => {
            const isSelected = timing === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setTiming(option.id)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={option.title}
              >
                {/* Radio circle */}
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                    {option.title}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Info banner ───────────────────────────────────────────────────  */}
        <View style={styles.infoBanner}>
          <Ionicons name="notifications-outline" size={18} color={colors.brand[500]} />
          <Text style={styles.infoBannerText}>
            You can edit or deactivate this message at any time before it is sent.
          </Text>
        </View>

        <View style={styles.spacer} />

        <Button label="Continue" onPress={handleContinue} style={styles.continueBtn} />
        <TouchableOpacity onPress={handleSaveDraft} style={styles.draftBtn} accessibilityRole="button">
          <Text style={styles.draftText}>Save as draft</Text>
        </TouchableOpacity>
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  stepRow: { alignItems: 'center', paddingBottom: spacing[4] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing[6], paddingBottom: spacing[6], gap: spacing[4], flexGrow: 1 },
  stepLabel: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.brand[600], letterSpacing: 1 },
  title: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.extrabold, color: colors.brand[900], letterSpacing: -0.6, marginTop: -spacing[2] },

  options: { gap: spacing[3] },
  optionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4],
    backgroundColor: colors.white, borderRadius: radii.xl,
    borderWidth: 1.5, borderColor: colors.grey[200], padding: spacing[5],
  },
  optionCardSelected: { borderColor: colors.brand[600], backgroundColor: colors.brand[50] },
  radio: {
    width: 24, height: 24, borderRadius: radii.full, borderWidth: 2,
    borderColor: colors.grey[300], alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  radioSelected: { borderColor: colors.brand[600], backgroundColor: colors.brand[600] },
  optionContent: { flex: 1, gap: spacing[1] },
  optionTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  optionTitleSelected: { color: colors.brand[800] },
  optionDescription: { fontSize: fontSizes.sm, color: colors.grey[500], lineHeight: fontSizes.sm * 1.5 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    backgroundColor: colors.brand[50], borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand[100], padding: spacing[4],
  },
  infoBannerText: { flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.brand[700], lineHeight: fontSizes.sm * 1.5 },

  spacer: { flex: 1, minHeight: spacing[6] },
  continueBtn: { borderRadius: radii.full },
  draftBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  draftText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[600] },
});
