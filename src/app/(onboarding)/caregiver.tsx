import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

const RELATIONSHIPS = ['Partner', 'Parent', 'Sibling', 'Friend', 'Child', 'Other'];

export default function CaregiverScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = name.trim().length > 0 && email.trim().length > 0 && relationship.length > 0;

  const handleNext = async () => {
    if (!canContinue) return;
    setLoading(true);
    // TODO: save caregiver to Supabase
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    router.push('/(onboarding)/plan');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your caregiver</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Step indicator ──────────────────────────────────────────────── */}
        <View style={styles.stepRow}>
          <StepIndicator total={3} current={1} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Icon ──────────────────────────────────────────────────────── */}
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>♡</Text>
          </View>

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <Text style={styles.title}>Who should we check with?</Text>
          <Text style={styles.subtitle}>
            Choose someone you trust to make sure you're okay.
          </Text>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <View style={styles.form}>
            <Input
              label="Their name"
              placeholder="e.g. Maya"
              value={name}
              onChangeText={setName}
              textContentType="name"
            />
            <Input
              label="Email"
              placeholder="maya@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              textContentType="emailAddress"
            />
            <Input
              label="Phone"
              labelRight="Optional"
              placeholder="+1 555 000 0000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              textContentType="telephoneNumber"
            />

            {/* Relationship dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Relationship</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowRelPicker(p => !p)}
                accessibilityLabel="Select relationship"
              >
                <Text style={relationship ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                  {relationship || 'Choose one'}
                </Text>
                <Text style={styles.dropdownChevron}>{showRelPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showRelPicker && (
                <View style={styles.pickerList}>
                  {RELATIONSHIPS.map(rel => (
                    <TouchableOpacity
                      key={rel}
                      style={[styles.pickerItem, relationship === rel && styles.pickerItemActive]}
                      onPress={() => {
                        setRelationship(rel);
                        setShowRelPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        relationship === rel && styles.pickerItemTextActive,
                      ]}>
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ── Next button ───────────────────────────────────────────────── */}
          <Button
            label="Next →"
            onPress={handleNext}
            loading={loading}
            disabled={!canContinue}
          />

          {/* ── Info banner ───────────────────────────────────────────────── */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerIcon}>✉</Text>
            <Text style={styles.infoBannerText}>
              They'll get an invite from us after you're set up — so they know what to expect.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },
  kav: { flex: 1 },

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
  backArrow: {
    fontSize: fontSizes.lg,
    color: colors.brand[900],
    marginTop: -1,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },

  stepRow: { alignItems: 'center', paddingBottom: spacing[4] },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },

  // Icon
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 28,
    color: colors.brand[600],
  },

  // Text
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
    lineHeight: fontSizes.md * 1.5,
  },

  form: { gap: spacing[4] },

  // Dropdown
  dropdownContainer: { gap: spacing[2] },
  dropdownLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  dropdownPlaceholder: {
    fontSize: fontSizes.md,
    color: colors.grey[400],
  },
  dropdownSelected: {
    fontSize: fontSizes.md,
    color: colors.brand[900],
    fontWeight: fontWeights.medium,
  },
  dropdownChevron: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
  },
  pickerList: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    overflow: 'hidden',
    marginTop: -spacing[2],
  },
  pickerItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100],
  },
  pickerItemActive: {
    backgroundColor: colors.brand[50],
  },
  pickerItemText: {
    fontSize: fontSizes.md,
    color: colors.brand[900],
  },
  pickerItemTextActive: {
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.brand[50],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand[100],
    padding: spacing[4],
  },
  infoBannerIcon: {
    fontSize: fontSizes.lg,
    color: colors.brand[600],
  },
  infoBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.brand[700],
    lineHeight: fontSizes.sm * 1.5,
  },
});
