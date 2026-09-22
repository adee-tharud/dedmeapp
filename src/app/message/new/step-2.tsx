import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StepIndicator } from '../../../components/ui/StepIndicator';
import { Button } from '../../../components/ui/Button';
import { useDraftStore } from '../../../features/messages/useDraftStore';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../../theme/tokens';

export default function Step2Screen() {
  const { body, setBody } = useDraftStore();
  const [text, setText] = useState(body);

  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => setBody(text), 600);
    return () => clearTimeout(timer);
  }, [text]);

  const handleContinue = () => {
    setBody(text);
    router.push('/message/new/step-3');
  };

  const handleSaveDraft = () => {
    setBody(text);
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
          <StepIndicator total={4} current={1} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepLabel}>STEP 2 OF 4</Text>
          <Text style={styles.title}>Write your message</Text>

          {/* ── Textarea ──────────────────────────────────────────────────── */}
          <View style={styles.textareaContainer}>
            <Text style={styles.textareaLabel}>Your message</Text>
            <TextInput
              style={styles.textarea}
              multiline
              placeholder="Write something meaningful..."
              placeholderTextColor={colors.grey[400]}
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
              accessibilityLabel="Message body"
            />
            <View style={styles.textareaFooter}>
              <Text style={styles.autoSave}>
                {text.length > 0 ? `Saved automatically · ${text.length} characters` : 'Start typing…'}
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <Button
            label="Continue"
            onPress={handleContinue}
            disabled={text.trim().length < 5}
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

  // Textarea
  textareaContainer: { gap: spacing[2] },
  textareaLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.brand[900] },
  textarea: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    padding: spacing[4],
    fontSize: fontSizes.md,
    color: colors.brand[900],
    minHeight: 200,
    lineHeight: fontSizes.md * 1.6,
  },
  textareaFooter: { alignItems: 'flex-end' },
  autoSave: { fontSize: fontSizes.xs, color: colors.grey[400] },

  spacer: { flex: 1, minHeight: spacing[6] },
  continueBtn: { borderRadius: radii.full },
  draftBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  draftText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[600] },
});
