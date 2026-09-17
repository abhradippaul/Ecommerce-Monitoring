import type { Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/token.js';
import type { AuthenticatedRequest, UserRole } from '../utils/types.js';
import { recordAuthAttempt, recordTokenOperation } from '../utils/metrics.js';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    recordAuthAttempt('token_verify', 'failure', 'missing_token');
    return res.status(401).json({
      message: 'Access token missing',
      error: 'Authentication required',
    });
  }

  try {
    req.user = verifyAccessToken(token);
    recordTokenOperation('verify', 'access', 'success');
    recordAuthAttempt('token_verify', 'success');
    next();
  } catch (error: any) {
    logger.error('JWT validation failed: ' + error.message);
    const reason = error.message?.includes('expired') ? 'token_expired' : 'token_invalid';
    recordTokenOperation('verify', 'access', 'failure');
    recordAuthAttempt('token_verify', 'failure', reason);
    return res.status(403).json({
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        message: 'Unauthorized',
        error: 'User is not authenticated',
      });
    }

    if (!allowedRoles.includes(authUser.role)) {
      return res.status(403).json({
        message: 'Forbidden',
        error: 'Insufficient permissions for this resource',
      });
    }

    next();
  };
};
