import jwt from 'jsonwebtoken';
import type { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import type { AccessTokenPayload, AuthUser, RefreshTokenPayload, TokenUser, UserRole } from './types.js';

const ACCESS_TOKEN_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY ?? '1h') as NonNullable<SignOptions['expiresIn']>;
const REFRESH_TOKEN_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY ?? '7d') as NonNullable<SignOptions['expiresIn']>;
const ACCESS_TOKEN_SECRET: Secret = process.env.ACCESS_TOKEN_SECRET ?? 'access-token-secret';
const REFRESH_TOKEN_SECRET: Secret = process.env.REFRESH_TOKEN_SECRET ?? 'refresh-token-secret';
const USER_ROLES: readonly UserRole[] = ['admin', 'seller', 'buyer'];

const isJwtPayload = (payload: string | JwtPayload): payload is JwtPayload => {
    return typeof payload === 'object' && payload !== null;
};

const isUserRole = (role: unknown): role is UserRole => {
    return typeof role === 'string' && USER_ROLES.includes(role as UserRole);
};

const generateAccessToken = (user: TokenUser) => {
    return jwt.sign(
        { id: user.id.toString(), role: user.role } satisfies AccessTokenPayload,
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

const generateRefreshToken = (user: Pick<TokenUser, 'id'>) => {
    return jwt.sign(
        { id: user.id.toString() } satisfies RefreshTokenPayload,
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

const verifyAccessToken = (token: string): AuthUser => {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    if (!isJwtPayload(decoded) || typeof decoded.id !== 'string' || !isUserRole(decoded.role)) {
        throw new Error('Invalid access token payload');
    }

    return {
        userId: decoded.id,
        role: decoded.role
    };
};

const verifyRefreshToken = (token: string): RefreshTokenPayload => {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);

    if (!isJwtPayload(decoded) || typeof decoded.id !== 'string') {
        throw new Error('Invalid refresh token payload');
    }

    return { id: decoded.id };
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
