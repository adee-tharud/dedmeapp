import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'caregiver';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isCaregiver = variant === 'caregiver';
  const isDanger = variant === 'danger';

  const indicatorColor = isPrimary || isCaregiver
    ? colors.white
    : isDanger
    ? colors.danger
    : colors.brand[700];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.base,
        size === 'sm' && styles.sizeSm,
        size === 'lg' && styles.sizeLg,
        isPrimary && styles.primary,
        isCaregiver && styles.caregiver,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconSlot}>{leftIcon}</View>}
          <Text
            style={[
              styles.label,
              size === 'sm' && styles.labelSm,
              size === 'lg' && styles.labelLg,
              isPrimary && styles.labelPrimary,
              isCaregiver && styles.labelCaregiver,
              isOutline && styles.labelOutline,
              isDanger && styles.labelDanger,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon && <View style={styles.iconSlot}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  sizeLg: {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[8],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand[700],
    shadowColor: colors.brand[800],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  caregiver: {
    backgroundColor: colors.caregiver[700],
    shadowColor: colors.caregiver[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brand[200],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.surface.danger,
    borderWidth: 1,
    borderColor: colors.surface.dangerBorder,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  labelSm: {
    fontSize: fontSizes.sm,
  },
  labelLg: {
    fontSize: fontSizes.lg,
  },
  labelPrimary: {
    color: colors.white,
  },
  labelCaregiver: {
    color: colors.white,
  },
  labelOutline: {
    color: colors.brand[800],
  },
  labelDanger: {
    color: colors.danger,
  },
});
