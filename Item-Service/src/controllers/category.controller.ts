import type { Request, Response } from 'express';
import { categoryService } from '../services/category.service.js';
import logger from '../utils/logger.js';
import { categorySchema } from '../schemas/category.schema.js';
import { ZodError } from 'zod';
import { withHttpSpan, withSpan } from '../utils/traces.js';
import { recordItemOperation, recordValidationError } from '../utils/metrics.js';
import { ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { simulateSlowness } from '../utils/slowness.js';

export const getCategories = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('getCategories', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('getCategories.simulateTrafficSlowness');
      const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
      const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10))) : 50;
      const skip = (page - 1) * limit;

      const categories = await withSpan('getCategories.fetch', () =>
        categoryService.getAllCategories(skip, limit)
      );
      recordItemOperation('list', 'success');
      logger.info('Fetched all categories', {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        count: categories.length,
        page,
        limit,
      });
      return res.status(200).json({
        message: 'Successfully fetched all categories',
        data: categories,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordItemOperation('list', 'failure');
      logger.error(`Error fetching categories: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to fetch categories',
        error: error.message || error,
      });
    }
  });
};

export const createCategory = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('createCategory', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('createCategory.simulateTrafficSlowness');
      const validatedData = await withSpan('createCategory.schemaValidation', () =>
        categorySchema.parse(req.body)
      );
      const category = await withSpan('createCategory.create', () =>
        categoryService.createCategory(validatedData)
      );
      recordItemOperation('create', 'success');
      logger.info(`Created/Found category: ${category.name}`, {
        trace_id: traceId,
        route,
        http_status_code: 201,
        duration_ms: Date.now() - start,
      });
      return res.status(201).json({
        message: 'Successfully processed category',
        data: category,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        span.setAttribute(ATTR_ERROR_TYPE, 'schema_validation');
        recordValidationError('schema', route);
        recordItemOperation('create', 'failure');
        logger.warn(`Validation error creating category: ${JSON.stringify(error.issues)}`, {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({
          message: 'Validation Error',
          error: error.issues,
        });
      }
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordItemOperation('create', 'failure');
      logger.error(`Error creating category: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to create category',
        error: error.message || error,
      });
    }
  });
};
