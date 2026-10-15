/**
 * Root layout — mounts the single auth listener and handles session-based
 * navigation so no signed-out user can reach (tabs) via deep link, and returning
 * authenticated users automatically bypass the login screens into the app.
 *
 * Security Guide §4: add a session listener once, in the root layout, and
 * gate every tab/onboarding route behind a session check.
 */
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { colors } from '@/theme/tokens';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { useRegisterPushToken } from '@/features/notifications';

// Prevent native splash screen from hiding until auth hydration completes
SplashScreen.preventAutoHideAsync().catch(() => {
  // Gracefully no-ops in environments where splash screen isn't available
});

/** Inner component that can use the auth context provided above it. */
function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register push token whenever a session is active.
  // Gracefully no-ops in Expo Go (see notifications.service).
  useRegisterPushToken(session?.user?.id ?? '');

  useEffect(() => {
    if (isLoading) return; // Still hydrating session from SecureStore — keep splash screen visible

    const inProtectedRoute = segments[0] === '(tabs)' || segments[0] === 'message';
    const inWelcomeRoute = !segments[0] || segments[0] === 'index';

    if (!session && inProtectedRoute) {
      // Signed-out or expired session user trying to access protected route → send to auth
      router.replace('/(auth)/');
    } else if (session && inWelcomeRoute) {
      // Returning authenticated user with valid 30-day session → auto-route to main app tabs
      router.replace('/(tabs)');
    }

    // Dismiss the splash screen now that initial route determination is done
    SplashScreen.hideAsync().catch(() => {});
  }, [session, isLoading, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.sky.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="message/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="message/new" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
