import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().min(1, { error: 'productId is required' }).trim(),
  name: z.string().min(1, { error: 'name is required' }).trim(),
  price: z
    .number({ error: 'price must be a number' })
    .nonnegative({ message: 'price must be non-negative' }),
  quantity: z
    .number({ error: 'quantity must be an integer' })
    .int()
    .positive({ message: 'quantity must be greater than 0' }),
  category: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
});

export const addToCartSchema = cartItemSchema;

export const updateCartItemSchema = z.object({
  quantity: z
    .number({ error: 'quantity must be an integer' })
    .int()
    .min(0, { message: 'quantity must be at least 0' }),
});

export const syncCartSchema = z.object({
  items: z.array(cartItemSchema),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type SyncCartInput = z.infer<typeof syncCartSchema>;
