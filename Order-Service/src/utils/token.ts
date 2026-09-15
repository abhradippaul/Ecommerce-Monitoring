import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import type {
  AuthUser,
  UserRole,
} from './types.js';
import { config } from './config.js';
import fs from 'fs';

const USER_ROLES: readonly UserRole[] = ['admin', 'seller', 'buyer'];

const isJwtPayload = (payload: string | JwtPayload): payload is JwtPayload => {
  return typeof payload === 'object' && payload !== null;
};

const isUserRole = (role: unknown): role is UserRole => {
  return typeof role === 'string' && USER_ROLES.includes(role as UserRole);
};

const publicKey = fs.readFileSync(config.jwtPublicKeyLocation, 'utf8');

const verifyAccessToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'auth-service',
  });

  if (!isJwtPayload(decoded) || typeof decoded.id !== 'string' || !isUserRole(decoded.role)) {
    throw new Error('Invalid access token payload');
  }

  return {
    userId: decoded.id,
    role: decoded.role,
  };
};

export { verifyAccessToken };
