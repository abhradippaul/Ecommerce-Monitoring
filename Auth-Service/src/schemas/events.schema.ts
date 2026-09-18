import { z } from 'zod';

export const userCreatedEventSchema = z.object({
  userId: z.string().min(1, { error: 'userId is required' }),
});

export type UserCreatedEvent = z.infer<typeof userCreatedEventSchema>;
