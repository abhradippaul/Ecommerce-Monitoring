import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/utils/token.js';
import { config } from '../../src/utils/config.js';

describe('Token Utils', () => {
  const originalConfig = { ...config };

  beforeEach(() => {
    config.accessTokenSecret = 'test-access-secret';
    config.refreshTokenSecret = 'test-refresh-secret';
    config.accessTokenExpiry = '15m';
    config.refreshTokenExpiry = '7d';
  });

  afterAll(() => {
    Object.assign(config, originalConfig);
  });

  describe('generateAccessToken & verifyAccessToken', () => {
    it('should generate and verify a valid access token', () => {
      const user = { id: 'user123', role: 'buyer' as const };
      const token = generateAccessToken(user);

      expect(typeof token).toBe('string');

      const payload = verifyAccessToken(token);
      expect(payload).toEqual({
        userId: 'user123',
        role: 'buyer',
      });
    });

    it('should throw an error if ACCESS_TOKEN_SECRET is missing on generation', () => {
      config.accessTokenSecret = '';
      expect(() => generateAccessToken({ id: '123', role: 'admin' })).toThrow(
        'ACCESS_TOKEN_SECRET is not configured'
      );
    });

    it('should throw an error if ACCESS_TOKEN_SECRET is missing on verification', () => {
      const token = generateAccessToken({ id: '123', role: 'admin' });
      config.accessTokenSecret = '';
      expect(() => verifyAccessToken(token)).toThrow('ACCESS_TOKEN_SECRET is not configured');
    });

    it('should throw an error on invalid access token signature', () => {
      const token = generateAccessToken({ id: '123', role: 'admin' });
      config.accessTokenSecret = 'different-secret';
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('generateRefreshToken & verifyRefreshToken', () => {
    it('should generate and verify a valid refresh token', () => {
      const user = { id: 'user456' };
      const token = generateRefreshToken(user);

      expect(typeof token).toBe('string');

      const payload = verifyRefreshToken(token);
      expect(payload).toEqual({ id: 'user456' });
    });

    it('should throw an error if REFRESH_TOKEN_SECRET is missing on generation', () => {
      config.refreshTokenSecret = '';
      expect(() => generateRefreshToken({ id: '456' })).toThrow(
        'REFRESH_TOKEN_SECRET is not configured'
      );
    });

    it('should throw an error if REFRESH_TOKEN_SECRET is missing on verification', () => {
      const token = generateRefreshToken({ id: '456' });
      config.refreshTokenSecret = '';
      expect(() => verifyRefreshToken(token)).toThrow('REFRESH_TOKEN_SECRET is not configured');
    });
  });
});
