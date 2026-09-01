import type { Request } from 'express';
import type { Types } from 'mongoose';
import type { z } from 'zod';
import type { registerSchema, loginSchema, updateUserSchema } from '../schemas/user.schema.js';

export type UserRole = 'admin' | 'seller' | 'buyer';

export interface TokenUser {
  id: Types.ObjectId;
  role: UserRole;
}

export interface AccessTokenPayload {
  id: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  id: string;
}

export interface AuthUser {
  userId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
