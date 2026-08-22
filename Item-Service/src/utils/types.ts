import type { Request } from 'express';
import type { Types } from 'mongoose';
import type { z } from 'zod';

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
