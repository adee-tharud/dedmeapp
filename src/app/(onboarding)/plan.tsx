import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { Button } from '../../components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    description: '1 caregiver · 1 message',
    price: '$0',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    badge: 'BEST VALUE',
    description: '5 caregivers · unlimited messages',
    price: '$24.99',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    badge: null,
    description: 'Everything, forever',
    price: '$59.99',
  },
] as const;

type PlanId = 'free' | 'yearly' | 'lifetime';

const FEATURES = [
  'Gentle check-in reminders',
  'Caregiver escalation',
  'End-to-end encrypted messages',
];

export default function PlanScreen() {
  const [selected, setSelected] = useState<PlanId>('yearly');
  const [loading, setLoading] = useState(false);

  const selectedPlan = PLANS.find(p => p.id === selected)!;

  const handleContinue = async () => {
    setLoading(true);
    // TODO: wire up RevenueCat / Stripe
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose your plan</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Step indicator ────────────────────────────────────────────────── */}
      <View style={styles.stepRow}>
        <StepIndicator total={3} current={2} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ─────────────────────────────────────────────────────────  */}
        <Text style={styles.title}>Simple peace of mind</Text>
        <Text style={styles.subtitle}>
          Start free, or support Deadme with a one-time or yearly plan.
        </Text>

        {/* ── Plan cards ────────────────────────────────────────────────────  */}
        <View style={styles.plans}>
          {PLANS.map(plan => {
            const isSelected = selected === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${plan.name} plan, ${plan.price}`}
              >
                {/* Radio + name row */}
                <View style={styles.planLeft}>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.planInfo}>
                    <View style={styles.planNameRow}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {plan.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{plan.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                </View>

                {/* Price */}
                <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                  {plan.price}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Features ──────────────────────────────────────────────────────  */}
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA ───────────────────────────────────────────────────────────  */}
        <Button
          label={`Continue with ${selectedPlan.name}`}
          onPress={handleContinue}
          loading={loading}
        />

        {/* ── Restore purchases ─────────────────────────────────────────────  */}
        <TouchableOpacity style={styles.restore} accessibilityLabel="Restore purchases">
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
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
  backArrow: { fontSize: fontSizes.lg, color: colors.brand[900], marginTop: -1 },
  headerTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },

  stepRow: { alignItems: 'center', paddingBottom: spacing[4] },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },

  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    marginTop: -spacing[3],
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.5,
  },

  // Plans
  plans: { gap: spacing[3] },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    padding: spacing[4],
  },
  planCardSelected: {
    borderColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.grey[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.brand[600], backgroundColor: colors.brand[600] },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
  },
  planInfo: { flex: 1, gap: 2 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  planName: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  badge: {
    backgroundColor: colors.sky.circle1,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: fontWeights.bold, color: colors.brand[700] },
  planDescription: { fontSize: fontSizes.sm, color: colors.grey[500] },
  planPrice: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.grey[600] },
  planPriceSelected: { color: colors.brand[800] },

  // Features
  features: { gap: spacing[3] },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  featureCheck: { fontSize: fontSizes.md, color: colors.success, fontWeight: fontWeights.bold },
  featureText: { fontSize: fontSizes.md, color: colors.brand[800], fontWeight: fontWeights.medium },

  // Restore
  restore: { alignItems: 'center' },
  restoreText: { fontSize: fontSizes.sm, color: colors.brand[600], fontWeight: fontWeights.medium },
});
