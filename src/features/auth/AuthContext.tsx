/**
 * Auth context — a single onAuthStateChange listener lives here (root
 * layout), so every screen reads auth state from one place rather than
 * re-checking it individually (Security Guide §4).
 *
 * Enforces a 30-day (1-month) maximum session lifetime stored in SecureStore.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  recordSessionStart,
  getSessionStartTime,
  isSessionExpired,
  clearSessionMetadata,
  setHasRegistered,
  getHasRegistered,
  getLastUserRole,
  setLastUserRole,
} from './session.service';
import { getCachedCheckIn, checkInKeys } from '@/features/checkin';
import { queryClient } from '@/lib/queryClient';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True while the initial session is being loaded and validated from SecureStore */
  isLoading: boolean;
  hasRegistered: boolean;
  userRole: 'caregiver' | 'user' | null;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  isLoading: true,
  hasRegistered: false,
  userRole: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRegistered, setHasRegisteredState] = useState(false);
  const [userRole, setUserRole] = useState<'caregiver' | 'user' | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Helper: Validates 30-day session lifetime; signs out if expired
    async function validateAndApplySession(currentSession: Session | null): Promise<Session | null> {
      if (!currentSession) {
        await clearSessionMetadata();
        return null;
      }

      const expired = await isSessionExpired();
      if (expired) {
        console.warn('[Auth] Session exceeded 30-day limit. Terminating session.');
        await clearSessionMetadata();
        await supabase.auth.signOut();
        return null;
      }

      // If session exists in Supabase but start timestamp hasn't been stamped, record it now
      const startTime = await getSessionStartTime();
      if (startTime === null) {
        await recordSessionStart();
      }

      return currentSession;
    }

    // 1. Initial hydration on app launch
    async function initAuth() {
      try {
        const [sessionRes, registered, cachedRole] = await Promise.all([
          supabase.auth.getSession(),
          getHasRegistered(),
          getLastUserRole(),
        ]);
        let activeRole = cachedRole;

        const activeSession = await validateAndApplySession(sessionRes.data.session);
        if (isMounted) {
          setSession(activeSession);
          const isRegistered = registered || !!activeSession;
          setHasRegisteredState(isRegistered);
          if (activeSession) {
            await setHasRegistered(true);

            // Deduce role if not yet cached in SecureStore for this device
            if (!activeRole && activeSession.user?.id) {
              try {
                const { count } = await supabase
                  .from('caregivers')
                  .select('id', { count: 'exact', head: true })
                  .eq('caregiver_user_id', activeSession.user.id)
                  .eq('status', 'accepted');
                if (count && count > 0) {
                  activeRole = 'caregiver';
                  await setLastUserRole('caregiver');
                } else {
                  activeRole = 'user';
                  await setLastUserRole('user');
                }
              } catch (roleErr) {
                console.warn('[Auth] Failed to deduce initial user role:', roleErr);
              }
            }
            setUserRole(activeRole);

            // Pre-seed React Query cache with local check-in timestamp before any screen mounts
            if (activeSession.user?.id) {
              const cachedTimestamp = await getCachedCheckIn(activeSession.user.id);
              if (cachedTimestamp) {
                queryClient.setQueryData(checkInKeys.latest(activeSession.user.id), {
                  id: 'cached',
                  user_id: activeSession.user.id,
                  checked_in_at: cachedTimestamp,
                  created_at: cachedTimestamp,
                });
              }
            }
          } else {
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error('[Auth] Failed to initialize session from SecureStore:', err);
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // 2. Supabase auth state change listener (entire app lifetime)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          await clearSessionMetadata();
          if (isMounted) {
            setSession(null);
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_IN') {
          await recordSessionStart();
          await setHasRegistered(true);
          if (isMounted) {
            setSession(newSession);
            setHasRegisteredState(true);
            setIsLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed in background: ensure overall 30-day window hasn't expired
          const expired = await isSessionExpired();
          if (expired) {
            console.warn('[Auth] Refreshed token rejected: 30-day session expired.');
            await clearSessionMetadata();
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setIsLoading(false);
            }
          } else {
            if (isMounted) {
              setSession(newSession);
              setIsLoading(false);
            }
          }
        } else {
          if (isMounted) {
            setSession(newSession);
            setIsLoading(false);
          }
        }
      },
    );

    // 3. AppState listener: re-verify 30-day expiry when app returns from background
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const expired = await isSessionExpired();
          if (expired) {
            console.warn('[Auth] Session expired while app was backgrounded. Terminating.');
            await clearSessionMetadata();
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
            }
          }
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        hasRegistered,
        userRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Read the current auth state anywhere in the tree. */
export function useAuth() {
  return useContext(AuthContext);
}
