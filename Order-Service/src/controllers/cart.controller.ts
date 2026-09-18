import type { Response } from 'express';
import { cartService } from '../services/cart.service.js';
import logger from '../utils/logger.js';
import { addToCartSchema, updateCartItemSchema, syncCartSchema } from '../schemas/cart.schema.js';
import { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../utils/types.js';
import { withHttpSpan, withSpan } from '../utils/traces.js';
import { recordOrderOperation, recordValidationError } from '../utils/metrics.js';
import { ATTR_ERROR_TYPE } from '@opentelemetry/semantic-conventions';
import { simulateSlowness } from '../utils/slowness.js';

const getUserId = (req: AuthenticatedRequest): string => {
  return (
    req.user?.userId ||
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    (req.body && req.body.userId) ||
    'anonymous-guest'
  );
};

export const getCart = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart';

  return await withHttpSpan('getCart', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('getCart.simulateTrafficSlowness');
      const cart = await withSpan('getCart.fetch', () => cartService.getCart(userId));
      recordOrderOperation('get_cart', 'success');
      logger.info(`Fetched cart for user: ${userId}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(200).json({
        message: 'Successfully fetched cart',
        data: cart,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('get_cart', 'failure');
      logger.error(`Error fetching cart: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to fetch cart',
        error: error.message || error,
      });
    }
  });
};

export const getCartCount = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart/count';

  return await withHttpSpan('getCartCount', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('getCartCount.simulateTrafficSlowness');
      const countData = await withSpan('getCartCount.fetch', () => cartService.getCartCount(userId));
      recordOrderOperation('get_cart_count', 'success');
      logger.info(`Fetched cart count for user: ${userId} (${countData.count} items)`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
        item_count: countData.count,
      });
      return res.status(200).json({
        message: 'Successfully fetched cart count',
        data: countData,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('get_cart_count', 'failure');
      logger.error(`Error fetching cart count: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to fetch cart count',
        error: error.message || error,
      });
    }
  });
};

export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart/items';

  return await withHttpSpan('addToCart', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('addToCart.simulateTrafficSlowness');
      const validatedItem = addToCartSchema.parse(req.body);
      const updatedCart = await withSpan('addToCart.save', () => cartService.addItem(userId, validatedItem));
      recordOrderOperation('add_to_cart', 'success');
      logger.info(`Added item ${validatedItem.productId} to cart for user ${userId}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
        product_id: validatedItem.productId,
      });
      return res.status(200).json({
        message: 'Successfully added item to cart',
        data: updatedCart,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        recordValidationError('addToCartSchema', route);
        recordOrderOperation('add_to_cart', 'failure');
        logger.error(`Validation error adding to cart: ${JSON.stringify(error.issues)}`, {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
          user_id: userId,
        });
        return res.status(400).json({
          message: 'Validation Error',
          error: error.issues,
        });
      }

      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('add_to_cart', 'failure');
      logger.error(`Error adding to cart: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to add item to cart',
        error: error.message || error,
      });
    }
  });
};

export const updateCartItem = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart/items/:productId';

  return await withHttpSpan('updateCartItem', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('updateCartItem.simulateTrafficSlowness');
      const paramId = req.params.productId;
      const productId = Array.isArray(paramId) ? paramId[0] : paramId;
      if (!productId) {
        recordValidationError('missing_productId', route);
        recordOrderOperation('update_cart', 'failure');
        logger.warn('productId parameter is required', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({ message: 'productId parameter is required' });
      }

      const { quantity } = updateCartItemSchema.parse(req.body);
      const updatedCart = await withSpan('updateCartItem.save', () =>
        cartService.updateItemQuantity(userId, productId, quantity)
      );
      recordOrderOperation('update_cart', 'success');
      logger.info(`Updated item ${productId} quantity to ${quantity} for user ${userId}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
        product_id: productId,
        quantity,
      });
      return res.status(200).json({
        message: 'Successfully updated cart item',
        data: updatedCart,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        recordValidationError('updateCartItemSchema', route);
        recordOrderOperation('update_cart', 'failure');
        logger.error(`Validation error updating cart: ${JSON.stringify(error.issues)}`, {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
          user_id: userId,
        });
        return res.status(400).json({
          message: 'Validation Error',
          error: error.issues,
        });
      }

      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('update_cart', 'failure');
      logger.error(`Error updating cart item: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to update cart item',
        error: error.message || error,
      });
    }
  });
};

export const removeCartItem = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart/items/:productId';

  return await withHttpSpan('removeCartItem', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('removeCartItem.simulateTrafficSlowness');
      const paramId = req.params.productId;
      const productId = Array.isArray(paramId) ? paramId[0] : paramId;
      if (!productId) {
        recordValidationError('missing_productId', route);
        recordOrderOperation('remove_from_cart', 'failure');
        logger.warn('productId parameter is required', {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
        });
        return res.status(400).json({ message: 'productId parameter is required' });
      }

      const updatedCart = await withSpan('removeCartItem.save', () => cartService.removeItem(userId, productId));
      recordOrderOperation('remove_from_cart', 'success');
      logger.info(`Removed item ${productId} from cart for user ${userId}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
        product_id: productId,
      });
      return res.status(200).json({
        message: 'Successfully removed item from cart',
        data: updatedCart,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('remove_from_cart', 'failure');
      logger.error(`Error removing item from cart: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to remove item from cart',
        error: error.message || error,
      });
    }
  });
};

export const syncCart = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart/sync';

  return await withHttpSpan('syncCart', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('syncCart.simulateTrafficSlowness');
      const { items } = syncCartSchema.parse(req.body);
      const updatedCart = await withSpan('syncCart.save', () => cartService.syncCart(userId, items));
      recordOrderOperation('sync_cart', 'success');
      logger.info(`Synced cart with ${items.length} items for user ${userId}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
        item_count: items.length,
      });
      return res.status(200).json({
        message: 'Successfully synced cart',
        data: updatedCart,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        recordValidationError('syncCartSchema', route);
        recordOrderOperation('sync_cart', 'failure');
        logger.error(`Validation error syncing cart: ${JSON.stringify(error.issues)}`, {
          trace_id: traceId,
          route,
          http_status_code: 400,
          duration_ms: Date.now() - start,
          user_id: userId,
        });
        return res.status(400).json({
          message: 'Validation Error',
          error: error.issues,
        });
      }

      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('sync_cart', 'failure');
      logger.error(`Error syncing cart: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to sync cart',
        error: error.message || error,
      });
    }
  });
};

export const clearCart = async (req: AuthenticatedRequest, res: Response) => {
  const start = Date.now();
  const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.originalUrl || '/api/v1/cart';

  return await withHttpSpan('clearCart', req, res, async span => {
    const traceId = span.spanContext().traceId;
    const userId = getUserId(req);
    try {
      await simulateSlowness('clearCart.simulateTrafficSlowness');
      const clearedCart = await withSpan('clearCart.save', () => cartService.clearCart(userId));
      recordOrderOperation('clear_cart', 'success');
      logger.info(`Cleared cart for user ${userId}`, {
        trace_id: traceId,
        route,
        http_status_code: 200,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(200).json({
        message: 'Successfully cleared cart',
        data: clearedCart,
      });
    } catch (error: any) {
      span.setAttribute(ATTR_ERROR_TYPE, error.name || 'Error');
      recordOrderOperation('clear_cart', 'failure');
      logger.error(`Error clearing cart: ${error.message || error}`, {
        trace_id: traceId,
        route,
        http_status_code: 500,
        duration_ms: Date.now() - start,
        user_id: userId,
      });
      return res.status(500).json({
        message: 'Failed to clear cart',
        error: error.message || error,
      });
    }
  });
};
