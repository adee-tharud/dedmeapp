/**
 * Root layout — mounts the single auth listener and handles session-based
 * navigation so no signed-out user can reach (tabs) via deep link.
 *
 * Security Guide §4: add a session listener once, in the root layout, and
 * gate every tab/onboarding route behind a session check.
 */
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { colors } from '../theme/tokens';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { queryClient } from '../lib/queryClient';
import { useRegisterPushToken } from '../features/notifications';

/** Inner component that can use the auth context provided above it. */
function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register push token whenever a session is active.
  // Gracefully no-ops in Expo Go (see notifications.service).
  useRegisterPushToken(session?.user?.id ?? '');
  useEffect(() => {
    if (isLoading) return; // still hydrating — don't redirect yet

    // Only the main app tabs require an active session.
    // Onboarding runs right after sign-up before email confirmation,
    // so it must NOT require a session — blocking it here was causing
    // the root layout to kick the user back to auth immediately after
    // sign-up when email confirmation is enabled (session is null until confirmed).
    const inProtectedRoute = segments[0] === '(tabs)';

    if (!session && inProtectedRoute) {
      // Signed-out user trying to access a protected route → send to auth
      router.replace('/(auth)/');
    }
    // Note: we intentionally do NOT auto-redirect on sign-in here; each
    // auth screen navigates explicitly after success so errors can still
    // be surfaced on that screen.
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
