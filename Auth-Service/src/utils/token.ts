import jwt from 'jsonwebtoken';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import type {
  AccessTokenPayload,
  AuthUser,
  RefreshTokenPayload,
  TokenUser,
  UserRole,
} from './types.js';
import { config } from './config.js';
import fs from 'fs';

const USER_ROLES: readonly UserRole[] = ['admin', 'seller', 'buyer'];
// const PRIVATE_KEY = fs.readFileSync(config.jwtPrivateKeyFileLocation, 'utf8');
// const PUBLIC_KEY = fs.readFileSync(config.jwtPublicKeyFileLocation, 'utf8');

// Loaded from secrets manager / env var at startup
const PRIVATE_KEY = Buffer.from(process.env.JWT_PRIVATE_KEY_BASE64!, 'base64').toString('utf8');
const PUBLIC_KEY = Buffer.from(process.env.JWT_PUBLIC_KEY_BASE64!, 'base64').toString('utf8');
const KEY_ID = process.env.JWT_KEY_ID! || 'key-2026-08'; // bump on rotation

const isJwtPayload = (payload: string | JwtPayload): payload is JwtPayload => {
  return typeof payload === 'object' && payload !== null;
};

const isUserRole = (role: unknown): role is UserRole => {
  return typeof role === 'string' && USER_ROLES.includes(role as UserRole);
};

const generateAccessToken = (user: TokenUser) => {
  return jwt.sign(
    { id: user.id.toString(), role: user.role } satisfies AccessTokenPayload,
    PRIVATE_KEY,
    {
      expiresIn: config.accessTokenExpiry as NonNullable<SignOptions['expiresIn']>, issuer: 'auth-service', algorithm: 'ES256', keyid: KEY_ID
    }
  );
};

const generateRefreshToken = (user: Pick<TokenUser, 'id'>) => {
  const secret: Secret = config.refreshTokenSecret;
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured');
  }
  return jwt.sign({ id: user.id.toString() } satisfies RefreshTokenPayload, secret, {
    expiresIn: config.refreshTokenExpiry as NonNullable<SignOptions['expiresIn']>,
  });
};

const verifyAccessToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['ES256'],
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

const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const secret: Secret = config.refreshTokenSecret;
  if (!secret) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured');
  }
  const decoded = jwt.verify(token, secret);

  if (!isJwtPayload(decoded) || typeof decoded.id !== 'string') {
    throw new Error('Invalid refresh token payload');
  }

  return { id: decoded.id };
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
