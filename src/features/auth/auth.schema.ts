/**
 * Auth Zod schemas — validated on the client (UX) and should be validated
 * again on any Edge Function that receives these values.
 *
 * Security Guide §7: never rely on .length > 0 for emails; validate proper
 * shape with Zod on both client and server.
 */
import { z } from 'zod';

export const signUpSchema = z.object({
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
