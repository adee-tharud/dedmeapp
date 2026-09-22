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
import { Ionicons } from '@expo/vector-icons';
import { StepIndicator } from '../../../components/ui/StepIndicator';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useDraftStore } from '../../../features/messages/useDraftStore';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../../theme/tokens';

export default function Step1Screen() {
  const { recipientName, recipientEmail, recipientPhone, setRecipient } = useDraftStore();
  const [name, setName] = useState(recipientName);
  const [email, setEmail] = useState(recipientEmail);
  const [phone, setPhone] = useState(recipientPhone);

  const canContinue = name.trim().length > 0 && email.trim().length > 0;

  const handleContinue = () => {
    setRecipient(name.trim(), email.trim(), phone.trim());
    router.push('/message/new/step-2');
  };

  const handleSaveDraft = () => {
    setRecipient(name.trim(), email.trim(), phone.trim());
    router.replace('/(tabs)/messages');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color={colors.brand[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New secret message</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.stepRow}>
          <StepIndicator total={4} current={0} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step label ────────────────────────────────────────────────── */}
          <Text style={styles.stepLabel}>STEP 1 OF 4</Text>
          <Text style={styles.title}>Who is it for?</Text>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <View style={styles.form}>
            <Input
              label="Name"
              placeholder="Their name"
              value={name}
              onChangeText={setName}
              textContentType="name"
            />
            <Input
              label="Email"
              placeholder="them@example.com"
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
          </View>

          {/* ── Info banner ───────────────────────────────────────────────── */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand[500]} />
            <Text style={styles.infoBannerText}>
              We'll verify their identity before sharing anything.
            </Text>
          </View>

          <View style={styles.spacer} />

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <Button
            label="Continue"
            onPress={handleContinue}
            disabled={!canContinue}
            style={styles.continueBtn}
          />
          <TouchableOpacity onPress={handleSaveDraft} style={styles.draftBtn} accessibilityRole="button">
            <Text style={styles.draftText}>Save as draft</Text>
          </TouchableOpacity>
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
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  stepRow: { alignItems: 'center', paddingBottom: spacing[4] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing[6], paddingBottom: spacing[6], gap: spacing[4] },
  stepLabel: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.brand[600], letterSpacing: 1 },
  title: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.extrabold, color: colors.brand[900], letterSpacing: -0.6, marginTop: -spacing[2] },
  form: { gap: spacing[4] },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.brand[50], borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand[100], padding: spacing[4],
  },
  infoBannerText: { flex: 1, fontSize: fontSizes.sm, color: colors.brand[700], lineHeight: fontSizes.sm * 1.5 },
  spacer: { flex: 1, minHeight: spacing[6] },
  continueBtn: { borderRadius: radii.full },
  draftBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  draftText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[600] },
});
