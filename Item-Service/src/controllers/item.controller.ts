import type { Request, Response } from 'express';
import { itemService } from '../services/item.service.js';
import logger from '../utils/logger.js';
import { itemSchema } from '../schemas/item.schema.js';
import { ZodError } from 'zod';
import { generateUploadPresignedUrl, generatePresignedPreviewUrl } from '../utils/s3Service.js';
import { withHttpSpan, withSpan } from '../utils/traces.js';
import { recordItemOperation, recordValidationError } from '../utils/metrics.js';
import { ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { simulateSlowness } from '../utils/slowness.js';

export const getItems = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('getItems', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('getItems.simulateTrafficSlowness');
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
      const category = req.query.category as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;

      const skip = (page - 1) * limit;
      const { items, hasNextPage } = await withSpan('getItems.fetch', () =>
        itemService.getAllItemsPaginated(skip, limit, category, sortBy)
      );

      recordItemOperation('list', 'success');
      logger.info(
        `Fetched items page ${page} with limit ${limit} for category ${category} and sortBy ${sortBy}`,
        {
          trace_id: traceId,
          route,
          http_status_code: 200,
          duration_ms: Date.now() - start,
        }
      );

      return res.status(200).json({
        message: 'Successfully fetched the items',
        data: {
          items,
          page,
          limit,
          hasNextPage,
        },
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordItemOperation('list', 'failure');
      logger.error(`Error fetching items: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to fetch all the items',
        error: error.message || error,
      });
    }
  });
};

export const getItemPresignedUrl = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('getItemPresignedUrl', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('getItemPresignedUrl.simulateTrafficSlowness');
      const fileExtension =
        (req.query.fileExtension as string) ||
        (req.query.extension as string) ||
        (req.query.fileName as string);

      if (!fileExtension) {
        span.setAttribute(ATTR_ERROR_TYPE, 'missing_param');
        recordValidationError('missing_file_extension', route);
        recordItemOperation('presign_upload', 'failure');
        logger.warn('fileExtension or fileName query parameter is required', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({
          message: 'fileExtension or fileName query parameter is required',
          error: 'Missing fileExtension',
        });
      }

      const result = await withSpan('getItemPresignedUrl.generate', () =>
        generateUploadPresignedUrl(fileExtension)
      );

      if (!result.uploadUrl) {
        span.setAttribute(ATTR_ERROR_TYPE, 'presigned_url_failed');
        recordItemOperation('presign_upload', 'failure');
        logger.error('Failed to generate presigned upload URL', {
          trace_id: traceId,
          route,
          http_status_code: 500,
          duration_ms: Date.now() - start,
        });
        return res.status(500).json({
          message: 'Failed to generate presigned upload URL',
          error: 'Presigned URL generation failed',
        });
      }

      recordItemOperation('presign_upload', 'success');
      logger.info('Successfully generated item upload presigned URL', {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });

      return res.status(200).json({
        message: 'Successfully generated item upload presigned URL',
        data: result,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordItemOperation('presign_upload', 'failure');
      logger.error(`Error generating item presigned URL: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to generate presigned URL',
        error: error.message || error,
      });
    }
  });
};

export const getItemPreviewPresignedUrl = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('getItemPreviewPresignedUrl', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('getItemPreviewPresignedUrl.simulateTrafficSlowness');
      const fileName =
        req.body?.file_name ||
        req.body?.fileName ||
        req.query.file_name ||
        req.query.fileName;

      if (!fileName) {
        span.setAttribute(ATTR_ERROR_TYPE, 'missing_param');
        recordValidationError('missing_file_name', route);
        recordItemOperation('presign_preview', 'failure');
        logger.warn('file_name is required for preview presigned URL', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({
          message: 'file_name is required',
          error: 'Missing file_name',
        });
      }

      const preview_url = await withSpan('getItemPreviewPresignedUrl.generate', () =>
        generatePresignedPreviewUrl(fileName as string)
      );

      if (!preview_url) {
        span.setAttribute(ATTR_ERROR_TYPE, 'presigned_preview_failed');
        recordItemOperation('presign_preview', 'failure');
        logger.error('Failed to generate presigned preview URL', {
          trace_id: traceId,
          route,
          http_status_code: 500,
          duration_ms: Date.now() - start,
        });
        return res.status(500).json({
          message: 'Failed to generate presigned preview URL',
          error: 'Presigned preview URL generation failed',
        });
      }

      recordItemOperation('presign_preview', 'success');
      logger.info(`Generated preview presigned URL for file: ${fileName}`, {
        file_name: fileName,
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });

      return res.status(200).json({
        file_name: fileName,
        preview_url,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordItemOperation('presign_preview', 'failure');
      logger.error(`Error generating item preview presigned URL: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to generate presigned preview URL',
        error: error.message || error,
      });
    }
  });
};

export const createItem = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('createItem', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('createItem.simulateTrafficSlowness');
      const validatedData = await withSpan('createItem.schemaValidation', () =>
        itemSchema.parse(req.body)
      );
      const newItem = await withSpan('createItem.create', () =>
        itemService.createItem(validatedData)
      );
      recordItemOperation('create', 'success');
      logger.info(`Created new item: ${validatedData.name}`, {
        item_id: newItem._id,
        trace_id: traceId,
        route,
        http_status_code: 201,
        duration_ms: Date.now() - start,
      });
      return res.status(201).json({
        message: 'Successfully created item',
        data: newItem,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        span.setAttribute(ATTR_ERROR_TYPE, 'schema_validation');
        recordValidationError('schema', route);
        recordItemOperation('create', 'failure');
        logger.warn(`Validation error creating item: ${JSON.stringify(error.issues)}`, {
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
      logger.error(`Error creating item: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to create item',
        error: error.message || error,
      });
    }
  });
};

export const updateItem = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('updateItem', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('updateItem.simulateTrafficSlowness');
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        span.setAttribute(ATTR_ERROR_TYPE, 'missing_id');
        recordValidationError('missing_id', route);
        recordItemOperation('update', 'failure');
        logger.warn('Invalid Item ID for update', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({
          message: 'Invalid Item ID',
          error: 'ID is required and must be a string',
        });
      }

      const validatedData = await withSpan('updateItem.schemaValidation', () =>
        itemSchema.parse(req.body)
      );
      const updatedItem = await withSpan('updateItem.update', () =>
        itemService.updateItem(id, validatedData)
      );

      if (!updatedItem) {
        span.setAttribute(ATTR_ERROR_TYPE, 'item_not_found');
        recordValidationError('item_not_found', route);
        recordItemOperation('update', 'failure');
        logger.warn(`Item not found for update: ${id}`, {
          trace_id: traceId,
          route,
          http_status_code: 404,
          duration_ms: Date.now() - start,
        });
        return res.status(404).json({
          message: 'Item not found',
          data: null,
        });
      }

      recordItemOperation('update', 'success');
      logger.info(`Updated item: ${id}`, {
        item_id: id,
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });

      return res.status(200).json({
        message: 'Successfully updated item',
        data: updatedItem,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        span.setAttribute(ATTR_ERROR_TYPE, 'schema_validation');
        recordValidationError('schema', route);
        recordItemOperation('update', 'failure');
        logger.warn(`Validation error updating item ${req.params.id}: ${JSON.stringify(error.issues)}`, {
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
      recordItemOperation('update', 'failure');
      logger.error(`Error updating item ${req.params.id}: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to update item',
        error: error.message || error,
      });
    }
  });
};

export const deleteItem = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl;

  await withHttpSpan('deleteItem', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('deleteItem.simulateTrafficSlowness');
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        span.setAttribute(ATTR_ERROR_TYPE, 'missing_id');
        recordValidationError('missing_id', route);
        recordItemOperation('delete', 'failure');
        logger.warn('Invalid Item ID for deletion', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({
          message: 'Invalid Item ID',
          error: 'ID is required and must be a string',
        });
      }

      const deletedItem = await withSpan('deleteItem.delete', () =>
        itemService.deleteItem(id)
      );

      if (!deletedItem) {
        span.setAttribute(ATTR_ERROR_TYPE, 'item_not_found');
        recordValidationError('item_not_found', route);
        recordItemOperation('delete', 'failure');
        logger.warn(`Item not found for deletion: ${id}`, {
          trace_id: traceId,
          route,
          http_status_code: 404,
          duration_ms: Date.now() - start,
        });
        return res.status(404).json({
          message: 'Item not found',
          data: null,
        });
      }

      recordItemOperation('delete', 'success');
      logger.info(`Deleted item: ${id}`, {
        item_id: id,
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
      });

      return res.status(200).json({
        message: 'Successfully deleted item',
        data: deletedItem,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordItemOperation('delete', 'failure');
      logger.error(`Error deleting item ${req.params.id}: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to delete item',
        error: error.message || error,
      });
    }
  });
};
