import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label: string;
  labelRight?: string;
  error?: string;
  containerStyle?: ViewStyle;
  suffix?: React.ReactNode;
}

export function Input({
  label,
  labelRight,
  error,
  containerStyle,
  suffix,
  secureTextEntry,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight && <Text style={styles.labelRight}>{labelRight}</Text>}
      </View>

      {/* Input box */}
      <View style={[styles.inputBox, focused && styles.inputBoxFocused, error ? styles.inputBoxError : null]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.grey[400]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        {/* Show/hide toggle for password */}
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={styles.suffix}>
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
        {suffix && !secureTextEntry && <View style={styles.suffix}>{suffix}</View>}
      </View>

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  labelRight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.grey[500],
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  inputBoxFocused: {
    borderColor: colors.brand[500],
  },
  inputBoxError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.brand[900],
    padding: 0,
  },
  suffix: {
    marginLeft: spacing[2],
  },
  toggleText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.brand[600],
  },
  error: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    marginTop: spacing[1],
  },
});
