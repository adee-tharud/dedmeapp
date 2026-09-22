import { Stack } from 'expo-router';
import { colors } from '../../../theme/tokens';

export default function NewMessageLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.sky.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  );
}
