import { z } from 'zod';

export const orderSchema = z.object({
  items: z
    .array(
      z.object({
        item: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Item ID'),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;
