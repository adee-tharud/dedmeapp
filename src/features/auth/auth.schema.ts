/**
 * Auth Zod schemas — validated on the client (UX) and should be validated
 * again on any Edge Function that receives these values.
 *
 * Security Guide §7: never rely on .length > 0 for emails; validate proper
 * shape with Zod on both client and server.
 */
import { z } from 'zod';

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(100, 'Name is too long'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'), // bcrypt max
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address'),
  token: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
  type: z.enum(['signup', 'email', 'magiclink', 'recovery']),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
