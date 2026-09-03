import type { Request, Response } from 'express';
import { profileService } from '../services/profile.service.js';
import { updateUserSchema, previewPresignedUrlSchema } from '../schemas/user.schema.js';
import logger from '../utils/logger.js';
import type { AuthenticatedRequest } from '../utils/types.js';
import { latencyHistogram, requestCounter, validationErrorCounter } from '../utils/metrics.js';
import { withSpan, withHttpSpan } from '../utils/traces.js';
import { ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { HttpError } from '../utils/error.js';
import { formatZodError } from '../utils/zod.js';
import { simulateSlowness } from '../utils/slowness.js';

export const getProfile = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withHttpSpan('getProfile', req, res, async span => {
    const traceId = span.spanContext().traceId;

    try {
      await simulateSlowness('getProfile.simulateTrafficSlowness');
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        validationErrorCounter.add(1, { error_type: 'unauthorized' });
        throw new HttpError(401, 'Unauthorized: Missing authentication context', 'unauthorized');
      }

      const user = await withSpan('getProfile.fetch', () =>
        profileService.getLimitedProfile(authUser.userId, authUser.role)
      );

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      const avatarPreviewUrl = user.avatarUrl
        ? await profileService.getAvatarPreviewUrl(user.avatarUrl)
        : null;

      return res.status(200).json({
        message: 'Profile retrieved successfully',
        data: {
          ...user.toObject(),
          avatarUrl: avatarPreviewUrl || user.avatarUrl,
        },
      });
    } catch (err: any) {
      span.setAttribute(ATTR_ERROR_TYPE, err.errorType ?? err.name ?? 'Error');
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

export const getDetailedProfile = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withHttpSpan('getDetailedProfile', req, res, async span => {
    const traceId = span.spanContext().traceId;

    try {
      await simulateSlowness('getDetailedProfile.simulateTrafficSlowness');
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        validationErrorCounter.add(1, { error_type: 'unauthorized' });
        throw new HttpError(401, 'Unauthorized: Missing authentication context', 'unauthorized');
      }

      const user = await withSpan('getDetailedProfile.fetch', () =>
        profileService.getProfile(authUser.userId, authUser.role)
      );

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      const avatarPreviewUrl = user.avatarUrl
        ? await profileService.getAvatarPreviewUrl(user.avatarUrl)
        : null;

      const finalAvatar = avatarPreviewUrl || user.avatarUrl;

      return res.status(200).json({
        message: 'Detailed profile retrieved successfully',
        data: {
          ...user.toObject(),
          user_id: user._id,
          first_name: user.firstName,
          last_name: user.lastName,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: finalAvatar,
          avatarUrl: finalAvatar,
        },
      });
    } catch (err: any) {
      span.setAttribute(ATTR_ERROR_TYPE, err.errorType ?? err.name ?? 'Error');
      const statusCode = err instanceof HttpError ? err.statusCode : 500;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Get detailed profile error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Get detailed profile error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Failed to retrieve detailed profile',
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

  await withHttpSpan('updateProfile', req, res, async span => {
    const traceId = span.spanContext().traceId;

    try {
      await simulateSlowness('updateProfile.simulateTrafficSlowness');
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
          throw new HttpError(400, formatZodError(result.error), 'schema_validation');
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
      span.setAttribute(ATTR_ERROR_TYPE, err.errorType ?? err.name ?? 'Error');
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

  await withHttpSpan('deleteProfile', req, res, async span => {
    const traceId = span.spanContext().traceId;

    try {
      await simulateSlowness('deleteProfile.simulateTrafficSlowness');
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
      span.setAttribute(ATTR_ERROR_TYPE, err.errorType ?? err.name ?? 'Error');
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

export const getAvatarPresignedUrl = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withHttpSpan('getAvatarPresignedUrl', req, res, async span => {
    const traceId = span.spanContext().traceId;

    try {
      await simulateSlowness('getAvatarPresignedUrl.simulateTrafficSlowness');
      const authUser = (req as AuthenticatedRequest).user;
      if (!authUser) {
        validationErrorCounter.add(1, { error_type: 'unauthorized' });
        throw new HttpError(401, 'Unauthorized: Missing authentication context', 'unauthorized');
      }

      const fileExtension =
        (req.query.fileExtension as string) ||
        (req.query.extension as string) ||
        (req.query.fileName as string);
      if (!fileExtension) {
        validationErrorCounter.add(1, { error_type: 'missing_filename' });
        throw new HttpError(
          400,
          'fileExtension or fileName query parameter is required',
          'missing_filename'
        );
      }

      const result = await profileService.getAvatarPresignedUrl(fileExtension, authUser.role);

      if (!result.uploadUrl) {
        throw new HttpError(500, 'Failed to generate presigned upload URL', 'presigned_url_failed');
      }

      return res.status(200).json({
        message: 'Presigned upload URL generated successfully',
        data: result,
      });
    } catch (err: any) {
      span.setAttribute(ATTR_ERROR_TYPE, err.errorType ?? err.name ?? 'Error');
      const statusCode = err instanceof HttpError ? err.statusCode : 500;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Get avatar presigned URL error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Get avatar presigned URL error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Failed to generate presigned upload URL',
        error: err.message,
      });
    }
  });
};

export const getPreviewPresignedUrl = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withHttpSpan('getPreviewPresignedUrl', req, res, async span => {
    const traceId = span.spanContext().traceId;

    try {
      await simulateSlowness('getPreviewPresignedUrl.simulateTrafficSlowness');
      const validatedData = await withSpan('getPreviewPresignedUrl.schemaValidation', async () => {
        const result = previewPresignedUrlSchema.safeParse(req.body);
        if (!result.success) {
          validationErrorCounter.add(1, { error_type: 'schema' });
          throw new HttpError(400, formatZodError(result.error), 'schema_validation');
        }
        return result.data;
      });

      const { file_name } = validatedData;
      const preview_url = await profileService.getAvatarPreviewUrl(file_name);

      if (!preview_url) {
        throw new HttpError(
          500,
          'Failed to generate presigned preview URL',
          'presigned_url_failed'
        );
      }

      logger.info(`Preview presigned URL generated for file: ${file_name}`, {
        file_name,
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
        file_name,
        preview_url,
      });
    } catch (err: any) {
      span.setAttribute(ATTR_ERROR_TYPE, err.errorType ?? err.name ?? 'Error');
      const statusCode = err instanceof HttpError ? err.statusCode : 400;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Get presigned preview URL error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Get presigned preview URL error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Failed to generate presigned preview URL',
        error: err.message,
      });
    }
  });
};
