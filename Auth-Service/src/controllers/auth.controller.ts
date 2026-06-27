import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  updateUserSchema,
  uploadAvatarUrlSchema,
} from '../schemas/user.schema.js';
import logger from '../utils/logger.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import type { AuthenticatedRequest } from '../utils/types.js';
import { latencyHistogram, requestCounter, validationErrorCounter } from '../utils/metrics.js';
import { withSpan } from '../utils/traces.js';
import { HttpError } from '../utils/error.js';
import { v4 as uuid } from 'uuid';
import { formatZodError } from '../utils/zod.js';

export const register = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('register', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const validatedData = await withSpan('register.schemaValidation', async () => {
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
          validationErrorCounter.add(1, { error_type: 'schema' });
          throw new HttpError(400, formatZodError(result.error), 'schema_validation');
        }
        return result.data;
      });

      const existingUser = await withSpan('register.checkExistingUser', () =>
        authService.findByEmailOrUsername(validatedData.email, validatedData.username, validatedData.phoneNumber)
      );

      if (existingUser) {
        validationErrorCounter.add(1, { error_type: 'user_exists' });
        throw new HttpError(400, 'User already exists', 'user_exists');
      }

      const user = await withSpan('register.createUser', () => authService.register(validatedData));

      if (!user?._id) {
        validationErrorCounter.add(1, { error_type: 'failed_to_register' });
        throw new HttpError(400, 'Registration failed', 'failed_to_register');
      }

      logger.info('User registered', {
        user_id: user._id,
        trace_id: traceId,
        route,
        http_status_code: 201,
        duration_ms: Date.now() - start,
      });
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'success',
      });

      return res.status(201).json({
        message: 'Successfully registered user',
        data: {
          first_name: user.firstName,
          last_name: user.lastName,
          avatar_url: user.avatarUrl,
          user_id: user._id,
          role: user.role,
          email: user.email,
          username: user.username,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
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
        logger.error('User registration failed', logPayload);
      } else {
        logger.warn('User registration failed', logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Registration failed',
        error: err.message,
      });
    }
  });
};

export const login = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('login', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const validatedData = await withSpan('login.schemaValidation', async () => {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
          validationErrorCounter.add(1, { error_type: 'schema' });
          throw new HttpError(400, 'Invalid login payload', 'schema_validation');
        }
        return result.data;
      });

      const user = await withSpan('login.fetchUser', () =>
        authService.findByEmail(validatedData.email)
      );

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(401, 'Invalid credentials', 'user_not_found');
      }

      await withSpan('login.passwordValidation', async () => {
        const valid = await user.comparePassword(validatedData.password);
        if (!valid) {
          validationErrorCounter.add(1, { error_type: 'invalid_credentials' });
          throw new HttpError(401, 'Invalid credentials', 'invalid_credentials');
        }
      });

      const userDetails = {
        id: user._id,
        role: user.role,
      };
      const access_token = generateAccessToken(userDetails);
      const refresh_token = generateRefreshToken(userDetails);

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info('User logged in', {
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
        message: 'Login successful',
        data: {
          access_token,
          refresh_token,
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
        logger.error('Login failed', logPayload);
      } else {
        logger.warn('Login failed', logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({ message: 'Login failed', error: err.message });
    }
  });
};

export const logout = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('logout', async span => {
    const traceId = span.spanContext().traceId;
    try {
      logger.info('User logged out', {
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
        message: 'Logged out successfully',
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
        logger.error('Logout failed', logPayload);
      } else {
        logger.warn('Logout failed', logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });
      res.status(statusCode).json({ message: 'Logout failed', error: err.message });
    }
  });
};

export const updateUser = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('updateUser', async span => {
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
        throw new HttpError(403, 'Forbidden: You can only update your own account', 'forbidden');
      }

      const validatedData = await withSpan('updateUser.schemaValidation', async () => {
        const result = updateUserSchema.safeParse(req.body);
        if (!result.success) {
          validationErrorCounter.add(1, { error_type: 'schema' });
          throw new HttpError(400, formatZodError(result.error), 'schema_validation');
        }
        return result.data;
      });

      const user = await withSpan('updateUser.update', () =>
        authService.update(id as string, validatedData)
      );

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      logger.info(`User updated: ${user.username}`, {
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
        message: 'User updated successfully',
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
        logger.error(`Update error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Update error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Update failed',
        error: err.message,
      });
    }
  });
};

export const uploadAvatarUrl = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('uploadAvatarUrl', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const validatedData = await withSpan('uploadAvatarUrl.schemaValidation', async () => {
        const result = uploadAvatarUrlSchema.safeParse(req.body);
        if (!result.success) {
          validationErrorCounter.add(1, { error_type: 'schema' });
          throw new HttpError(400, formatZodError(result.error), 'schema_validation');
        }
        return result.data;
      });
      const { fileExtension, role } = validatedData;

      const fileName = `avatar/images/${role}/${Date.now()}/${uuid()}.${fileExtension}`;

      const presignedUrl = await withSpan('uploadAvatarUrl.getPresignedUrl', () =>
        authService.getAvatarUploadUrl({
          fileName,
          expires: 60 * 60,
          contentType: `image/${fileExtension}`,
        })
      );

      logger.info(`Avatar upload URL generated for file: ${fileName}`, {
        file_name: fileName,
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
        message: 'Avatar upload URL generated successfully',
        data: {
          presignedUrl,
          fileName,
        },
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
        logger.error(`Upload avatar URL error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Upload avatar URL error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Upload avatar URL failed',
        error: err.message,
      });
    }
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.route ? `${req.baseUrl}${req.route.path}` : req.originalUrl;
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('deleteUser', async span => {
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
        throw new HttpError(403, 'Forbidden: You can only delete your own account', 'forbidden');
      }

      const deleted = await withSpan('deleteUser.delete', () => authService.delete(id as string));

      if (!deleted) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User not found', 'user_not_found');
      }

      logger.info(`User deleted: ${id}`, {
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
        message: 'User deleted successfully',
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
        logger.error(`Delete error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Delete error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Delete failed',
        error: err.message,
      });
    }
  });
};

export const refresh = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = '/auth/refresh';
  const httpMethod = req.method;
  requestCounter.add(1, { route, http_method: httpMethod });

  await withSpan('refresh', async span => {
    const traceId = span.spanContext().traceId;

    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        validationErrorCounter.add(1, { error_type: 'missing_refresh_token' });
        throw new HttpError(400, 'Refresh token is required', 'missing_refresh_token');
      }

      const payload = verifyRefreshToken(refresh_token);
      const user = await authService.findById(payload.id);

      if (!user) {
        validationErrorCounter.add(1, { error_type: 'user_not_found' });
        throw new HttpError(404, 'User associated with this token not found', 'user_not_found');
      }

      const newAccessToken = generateAccessToken({
        id: user._id,
        role: user.role,
      });

      logger.info(`Token refreshed successfully for user: ${user.username}`, {
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
        message: 'Token refreshed successfully',
        data: {
          access_token: newAccessToken,
        },
      });
    } catch (err: any) {
      const statusCode = err instanceof HttpError ? err.statusCode : 403;
      const logPayload = {
        reason: err.errorType ?? 'unexpected',
        trace_id: traceId,
        route,
        http_status_code: statusCode,
        duration_ms: Date.now() - start,
      };

      if (statusCode >= 500) {
        logger.error(`Refresh error: ${err.message}`, logPayload);
      } else {
        logger.warn(`Refresh error: ${err.message}`, logPayload);
      }
      latencyHistogram.record(Date.now() - start, {
        route,
        http_method: httpMethod,
        status: 'error',
      });

      return res.status(statusCode).json({
        message: 'Token refresh failed',
        error: err.message,
      });
    }
  });
};
