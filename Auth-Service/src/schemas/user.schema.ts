import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(3, 'First name must be at least 3 characters').max(20).trim(),
  lastName: z.string().min(3, 'Last name must be at least 3 characters').max(20).trim(),
  avatarUrl: z.string().trim().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20).trim(),
  email: z.email('Invalid email address').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'seller', 'buyer']).default('buyer'),
  businessName: z.string().trim().optional(),
  phoneNumber: z.string().trim(),
  streetAddress: z.string().trim().optional(),
  city: z.string().trim().optional(),
  stateProvince: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  storeName: z.string().trim().optional(),
  storeDescription: z.string().trim().optional(),
  storeLogoUrl: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.email('Invalid email address').trim(),
  password: z.string(),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(20).trim().optional(),
  email: z.email().trim().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'seller', 'buyer']).optional(),
  phoneNumber: z.string().trim().optional(),
  businessName: z.string().trim().optional(),
  streetAddress: z.string().trim().optional(),
  city: z.string().trim().optional(),
  stateProvince: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  storeName: z.string().trim().optional(),
  storeDescription: z.string().trim().optional(),
  storeLogoUrl: z.string().trim().optional(),
});

export const uploadAvatarUrlSchema = z.object({
  fileExtension: z.enum(['jpg', 'jpeg', 'png', 'webp'], {
    message: 'Invalid file extension. Only jpg, jpeg, png, and webp are allowed.',
  }),
  role: z.enum(['admin', 'seller', 'buyer']).default('buyer'),
});
