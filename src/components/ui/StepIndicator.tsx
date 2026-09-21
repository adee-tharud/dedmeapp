import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

interface StepIndicatorProps {
  total: number;
  current: number; // 0-indexed
}

export function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.pill,
            i === current ? styles.active : styles.inactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pill: {
    height: 4,
    borderRadius: radii.full,
  },
  active: {
    width: 32,
    backgroundColor: colors.brand[700],
  },
  inactive: {
    width: 20,
    backgroundColor: colors.brand[200],
  },
});
