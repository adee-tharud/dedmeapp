import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, fontWeights } from '../../theme/tokens';

export default function SettingsScreen() {
  return (
    <View style={s.c}>
      <Text style={s.t}>Settings — coming soon</Text>
    </View>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.sky.bg, alignItems: 'center', justifyContent: 'center' },
  t: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.brand[700] },
});
