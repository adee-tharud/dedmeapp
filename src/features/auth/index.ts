// Auth feature — barrel export
// Consumers: import { useAuth, useProfile, signIn } from '@/features/auth'

export { AuthProvider, useAuth } from './AuthContext';

// Service functions (for callers that need to call directly, e.g. form handlers)
export { signUp, signIn, signOut, getAuthUser, verifyOtp, resendOtp } from './auth.service';
export { getProfile, upsertProfile, updateProfile } from './profile.service';
export {
  recordSessionStart,
  getSessionStartTime,
  isSessionExpired,
  clearSessionMetadata,
  setHasRegistered,
  getHasRegistered,
  setLastUserRole,
  getLastUserRole,
  ONE_MONTH_MS,
} from './session.service';

// Hooks (preferred for React components)
export {
  useProfile,
  useSignUp,
  useSignIn,
  useSignOut,
  useUpsertProfile,
  useUpdateProfile,
  profileKeys,
} from './auth.hooks';

// Schemas
export { signUpSchema, signInSchema, verifyOtpSchema } from './auth.schema';
export type { SignUpInput, SignInInput, VerifyOtpInput } from './auth.schema';
