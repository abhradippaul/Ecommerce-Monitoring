import type { Request, Response } from 'express';
import { profileService } from '../services/profile.service.js';
import { updateUserSchema } from '../schemas/user.schema.js';
import logger from '../utils/logger.js';
import type { AuthenticatedRequest } from '../utils/types.js';
import { latencyHistogram, requestCounter, validationErrorCounter } from '../utils/metrics.js';
import { withSpan } from '../utils/traces.js';
import { HttpError } from '../utils/error.js';

export const getProfile = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('getProfile', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        validationErrorCounter.add(1, { error_type: 'unauthorized' });
        throw new HttpError(401, 'Unauthorized: Missing authentication context', 'unauthorized');
      }

      const user = await withSpan('getProfile.fetch', () =>
        profileService.getProfile(authUser.userId, authUser.role)
      );

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      logger.info(`Profile retrieved for user: ${user.username}`, {
        user_id: user._id,
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'success',
      });

      return res.status(200).json({
        message: 'Profile retrieved successfully',
        data: {
          user_id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err: any) {
      const statusCode = err instanceof HttpError ? err.statusCode : 500;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Get profile error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Get profile error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Failed to retrieve profile',
        error: err.message,
      });
    }
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('updateProfile', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const { id } = req.params;
      if (!id) {
        validationErrorCounter.add(1, { error_type: 'missing_id' });
        throw new HttpError(400, 'ID is required', 'missing_id');
      }

      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        validationErrorCounter.add(1, { error_type: 'unauthorized' });
        throw new HttpError(401, 'Unauthorized: Missing authentication context', 'unauthorized');
      }

      if (authUser.role !== 'admin' && authUser.userId !== id) {
        validationErrorCounter.add(1, { error_type: 'forbidden' });
        throw new HttpError(403, 'Forbidden: You can only update your own profile', 'forbidden');
      }

      const validatedData = await withSpan('updateProfile.schemaValidation', async () => {
        const result = updateUserSchema.safeParse(req.body);
        if (!result.success) {
          validationErrorCounter.add(1, { error_type: 'schema' });
          throw new HttpError(400, result.error.message, 'schema_validation');
        }
        return result.data;
      });

      const user = await withSpan('updateProfile.update', () =>
        profileService.updateProfile(id as string, authUser.role, validatedData)
      );

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      logger.info(`Profile updated for user: ${user.username}`, {
        user_id: user._id,
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'success',
      });

      return res.status(200).json({
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (err: any) {
      const statusCode = err instanceof HttpError ? err.statusCode : 400;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Update profile error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Update profile error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Profile update failed',
        error: err.message,
      });
    }
  });
};

export const deleteProfile = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('deleteProfile', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const { id } = req.params;
      if (!id) {
        validationErrorCounter.add(1, { error_type: 'missing_id' });
        throw new HttpError(400, 'ID is required', 'missing_id');
      }

      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        validationErrorCounter.add(1, { error_type: 'unauthorized' });
        throw new HttpError(401, 'Unauthorized: Missing authentication context', 'unauthorized');
      }

      if (authUser.role !== 'admin' && authUser.userId !== id) {
        validationErrorCounter.add(1, { error_type: 'forbidden' });
        throw new HttpError(403, 'Forbidden: You can only delete your own profile', 'forbidden');
      }

      const deleted = await withSpan('deleteProfile.delete', () =>
        profileService.deleteProfile(id as string, authUser.role)
      );

      if (!deleted) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      logger.info(`Profile deleted: ${id}`, {
        user_id: id,
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'success',
      });

      return res.status(200).json({
        message: 'Profile deleted successfully',
      });
    } catch (err: any) {
      const statusCode = err instanceof HttpError ? err.statusCode : 400;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Delete profile error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Delete profile error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Profile delete failed',
        error: err.message,
      });
    }
  });
};
