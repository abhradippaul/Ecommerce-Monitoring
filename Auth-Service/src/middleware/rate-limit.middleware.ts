import type { Request, Response, NextFunction } from 'express';
import valkey from '../utils/valkey.js';
import logger from '../utils/logger.js';
import type { RateLimitOptions } from '../utils/types.js';
import { config } from '../utils/config.js';

export const rateLimit = (options: RateLimitOptions) => {
    const { windowMs, max, keyPrefix = 'rl' } = options;
    const windowSec = Math.ceil(windowMs / 1000);

    return async (req: Request, res: Response, next: NextFunction) => {
        const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')?.pop()?.trim() ||
            req.socket.remoteAddress ||
            'unknown';

        const key = `${keyPrefix}:${ip}`;

        try {
            const current = await valkey.incr(key);

            if (current === 1) {
                await valkey.expire(key, windowSec);
            }

            const ttl = await valkey.ttl(key);
            const resetAt = Date.now() + ttl * 1000;

            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
            res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

            if (current > max) {
                res.setHeader('Retry-After', ttl);
                return res.status(429).json({
                    message: 'Too many requests, please try again later.',
                    error: 'Rate limit exceeded',
                });
            }

            next();
        } catch (err: any) {
            // Fail open: let the request through if Valkey is unavailable
            logger.error('Rate limit check failed: ' + err.message);
            next();
        }
    };
};

export const authRateLimit = rateLimit(config.rateLimit);
