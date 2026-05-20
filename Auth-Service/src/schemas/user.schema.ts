import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20).trim(),
  email: z.email('Invalid email address').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'seller', 'buyer']).default('buyer')
});

export const loginSchema = z.object({
  email: z.email('Invalid email address').trim(),
  password: z.string()
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(20).trim().optional(),
  email: z.email().trim().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'seller', 'buyer']).optional()
});
