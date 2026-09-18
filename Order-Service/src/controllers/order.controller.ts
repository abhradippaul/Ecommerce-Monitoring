import type { Request, Response } from 'express';
import { orderService } from '../services/order.service.js';
import logger from '../utils/logger.js';
import { orderSchema } from '../schemas/order.schema.js';
import { ZodError } from 'zod';
import { withHttpSpan, withSpan } from '../utils/traces.js';
import { recordOrderOperation, recordValidationError } from '../utils/metrics.js';
import { ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { simulateSlowness } from '../utils/slowness.js';

export const createOrder = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/orders';

  await withHttpSpan('createOrder', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('createOrder.simulateTrafficSlowness');
      const validatedData = orderSchema.parse(req.body);
      const newOrder = await withSpan('createOrder.save', () => orderService.createOrder(validatedData));

      recordOrderOperation('create_order', 'success');
      logger.info(`Created new order: ${newOrder._id}`, {
        trace_id: traceId,
        route,
        http_status_code: 201,
        duration_ms: Date.now() - start,
        order_id: newOrder._id,
      });

      return res.status(201).json({
        message: 'Successfully created order',
        data: newOrder,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        recordValidationError('orderSchema', route);
        recordOrderOperation('create_order', 'failure');
        logger.error(`Validation error creating order: ${JSON.stringify(error.issues)}`, {
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

      if (error.message && error.message.includes('not found')) {
        recordOrderOperation('create_order', 'failure');
        logger.warn(`Item not found for order: ${error.message}`, {
          trace_id: traceId,
          route,
          http_status_code: 404,
          duration_ms: Date.now() - start,
        });
        return res.status(404).json({
          message: 'Item not found',
          error: error.message,
        });
      }

      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('create_order', 'failure');
      logger.error(`Error creating order: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to create order',
        error: error.message || error,
      });
    }
  });
};

export const getOrders = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/orders';

  await withHttpSpan('getOrders', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('getOrders.simulateTrafficSlowness');
      const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : 1;
      const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10))) : 20;
      const skip = (page - 1) * limit;

      const orders = await withSpan('getOrders.fetch', () => orderService.getAllOrders(skip, limit));
      recordOrderOperation('list_orders', 'success');
      logger.info('Fetched all orders', {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        count: orders.length,
        page,
        limit,
      });
      return res.status(200).json({
        message: 'Successfully fetched all orders',
        data: orders,
        pagination: {
          page,
          limit,
          count: orders.length,
        },
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('list_orders', 'failure');
      logger.error(`Error fetching orders: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to fetch orders',
        error: error.message || error,
      });
    }
  });
};

export const getOrderById = async (req: Request, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/orders/:id';

  await withHttpSpan('getOrderById', req, res, async span => {
    const traceId = span.spanContext().traceId;
    try {
      await simulateSlowness('getOrderById.simulateTrafficSlowness');
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        recordValidationError('invalid_order_id', route);
        recordOrderOperation('get_order', 'failure');
        logger.warn('Invalid Order ID', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({
          message: 'Invalid Order ID',
          error: 'ID is required and must be a string',
        });
      }

      const order = await withSpan('getOrderById.fetch', () => orderService.getOrderById(id));
      if (!order) {
        recordOrderOperation('get_order', 'failure');
        logger.warn(`Order not found: ${id}`, {
          trace_id: traceId,
          route,
          http_status_code: 404,
          duration_ms: Date.now() - start,
          order_id: id,
        });
        return res.status(404).json({
          message: 'Order not found',
          data: null,
        });
      }

      recordOrderOperation('get_order', 'success');
      logger.info(`Fetched order: ${id}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        order_id: id,
      });
      return res.status(200).json({
        message: 'Successfully fetched order',
        data: order,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('get_order', 'failure');
      logger.error(`Error fetching order ${req.params.id}: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
      });
      return res.status(500).json({
        message: 'Failed to fetch order',
        error: error.message || error,
      });
    }
  });
};
