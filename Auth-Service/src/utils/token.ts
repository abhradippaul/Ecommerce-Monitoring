import jwt from 'jsonwebtoken';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import type { AccessTokenPayload, AuthUser, RefreshTokenPayload, TokenUser, UserRole } from './types.js';
import { config } from './config.js';

const USER_ROLES: readonly UserRole[] = ['admin', 'seller', 'buyer'];

const isJwtPayload = (payload: string | JwtPayload): payload is JwtPayload => {
    return typeof payload === 'object' && payload !== null;
};

const isUserRole = (role: unknown): role is UserRole => {
    return typeof role === 'string' && USER_ROLES.includes(role as UserRole);
};

const generateAccessToken = (user: TokenUser) => {
    const secret: Secret = config.accessTokenSecret;
    if (!secret) {
        throw new Error('ACCESS_TOKEN_SECRET is not configured');
    }
    return jwt.sign(
        { id: user.id.toString(), role: user.role } satisfies AccessTokenPayload,
        secret,
        { expiresIn: config.accessTokenExpiry as NonNullable<SignOptions['expiresIn']> }
    );
};

const generateRefreshToken = (user: Pick<TokenUser, 'id'>) => {
    const secret: Secret = config.refreshTokenSecret;
    if (!secret) {
        throw new Error('REFRESH_TOKEN_SECRET is not configured');
    }
    return jwt.sign(
        { id: user.id.toString() } satisfies RefreshTokenPayload,
        secret,
        { expiresIn: config.refreshTokenExpiry as NonNullable<SignOptions['expiresIn']> }
    );
};

const verifyAccessToken = (token: string): AuthUser => {
    const secret: Secret = config.accessTokenSecret;
    if (!secret) {
        throw new Error('ACCESS_TOKEN_SECRET is not configured');
    }
    const decoded = jwt.verify(token, secret);

    if (!isJwtPayload(decoded) || typeof decoded.id !== 'string' || !isUserRole(decoded.role)) {
        throw new Error('Invalid access token payload');
    }

    return {
        userId: decoded.id,
        role: decoded.role
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
