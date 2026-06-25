import { z } from 'zod';

export const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  sku: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  brand: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  price: z.number().positive('Price must be a positive number'),
  discountPrice: z.number().nonnegative('Discount price must be a non-negative number').optional().nullable(),
  quantity: z.number().int().nonnegative('Quantity must be a non-negative integer'),
  images: z.array(z.string().url('Invalid image URL format')).optional().nullable(),
  weight: z.number().nonnegative('Weight must be a non-negative number').optional().nullable(),
  dimensions: z.object({
    length: z.number().nonnegative().optional().nullable(),
    width: z.number().nonnegative().optional().nullable(),
    height: z.number().nonnegative().optional().nullable()
  }).optional().nullable(),
  color: z.string().trim().optional().nullable(),
  size: z.string().trim().optional().nullable(),
  material: z.string().trim().optional().nullable(),
  shippingCharges: z.number().nonnegative('Shipping charges must be a non-negative number').optional().nullable(),
  returnPolicy: z.string().trim().optional().nullable(),
  warrantyInfo: z.string().trim().optional().nullable()
});

export type ItemInput = z.infer<typeof itemSchema>;
