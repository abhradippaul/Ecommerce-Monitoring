import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/utils/token.js', () => ({
  verifyAccessToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

const { authenticateToken, requireRole } = await import('../../src/middleware/auth.middleware.js');
const tokenUtils = await import('../../src/utils/token.js');

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../src/utils/types.js';

describe('Auth Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should return 401 if authorization header is missing', () => {
      authenticateToken(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access token missing',
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and set req.user on valid token', () => {
      req.headers = { authorization: 'Bearer valid-token' };
      const userPayload = { userId: '123', role: 'admin' as const };
      (tokenUtils.verifyAccessToken as jest.Mock).mockReturnValue(userPayload);

      authenticateToken(req as AuthenticatedRequest, res as Response, next);

      expect(tokenUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(userPayload);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 on invalid token', () => {
      req.headers = { authorization: 'Bearer invalid-token' };
      (tokenUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      authenticateToken(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid or expired token',
        error: 'jwt expired',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 if req.user is missing', () => {
      const middleware = requireRole(['admin']);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
        error: 'User is not authenticated',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not allowed', () => {
      req.user = { userId: '123', role: 'buyer' };
      const middleware = requireRole(['admin', 'seller']);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Forbidden',
        error: 'Insufficient permissions for this resource',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user role is allowed', () => {
      req.user = { userId: '123', role: 'seller' };
      const middleware = requireRole(['admin', 'seller']);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
