import type { Response } from 'express';
import { cartService } from '../services/cart.service.js';
import logger from '../logger/index.js';
import { addToCartSchema, updateCartItemSchema, syncCartSchema } from '../schemas/cart.schema.js';
import { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../utils/types.js';

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
  try {
    const userId = getUserId(req);
    const cart = await cartService.getCart(userId);
    logger.info(`Fetched cart for user: ${userId}`);
    return res.status(200).json({
      message: 'Successfully fetched cart',
      data: cart,
    });
  } catch (error: any) {
    logger.error(`Error fetching cart: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to fetch cart',
      error: error.message || error,
    });
  }
};

export const getCartCount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const countData = await cartService.getCartCount(userId);
    logger.info(`Fetched cart count for user: ${userId} (${countData.count} items)`);
    return res.status(200).json({
      message: 'Successfully fetched cart count',
      data: countData,
    });
  } catch (error: any) {
    logger.error(`Error fetching cart count: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to fetch cart count',
      error: error.message || error,
    });
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const validatedItem = addToCartSchema.parse(req.body);
    const updatedCart = await cartService.addItem(userId, validatedItem);
    logger.info(`Added item ${validatedItem.productId} to cart for user ${userId}`);
    return res.status(200).json({
      message: 'Successfully added item to cart',
      data: updatedCart,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      logger.error(`Validation error adding to cart: ${JSON.stringify(error.issues)}`);
      return res.status(400).json({
        message: 'Validation Error',
        error: error.issues,
      });
    }

    logger.error(`Error adding to cart: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to add item to cart',
      error: error.message || error,
    });
  }
};

export const updateCartItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const paramId = req.params.productId;
    const productId = Array.isArray(paramId) ? paramId[0] : paramId;
    if (!productId) {
      return res.status(400).json({ message: 'productId parameter is required' });
    }

    const { quantity } = updateCartItemSchema.parse(req.body);
    const updatedCart = await cartService.updateItemQuantity(userId, productId, quantity);
    logger.info(`Updated item ${productId} quantity to ${quantity} for user ${userId}`);
    return res.status(200).json({
      message: 'Successfully updated cart item',
      data: updatedCart,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation Error',
        error: error.issues,
      });
    }

    logger.error(`Error updating cart item: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to update cart item',
      error: error.message || error,
    });
  }
};

export const removeCartItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const paramId = req.params.productId;
    const productId = Array.isArray(paramId) ? paramId[0] : paramId;
    if (!productId) {
      return res.status(400).json({ message: 'productId parameter is required' });
    }

    const updatedCart = await cartService.removeItem(userId, productId);
    logger.info(`Removed item ${productId} from cart for user ${userId}`);
    return res.status(200).json({
      message: 'Successfully removed item from cart',
      data: updatedCart,
    });
  } catch (error: any) {
    logger.error(`Error removing item from cart: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to remove item from cart',
      error: error.message || error,
    });
  }
};

export const syncCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { items } = syncCartSchema.parse(req.body);
    const updatedCart = await cartService.syncCart(userId, items);
    logger.info(`Synced cart with ${items.length} items for user ${userId}`);
    return res.status(200).json({
      message: 'Successfully synced cart',
      data: updatedCart,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation Error',
        error: error.issues,
      });
    }

    logger.error(`Error syncing cart: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to sync cart',
      error: error.message || error,
    });
  }
};

export const clearCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const clearedCart = await cartService.clearCart(userId);
    logger.info(`Cleared cart for user ${userId}`);
    return res.status(200).json({
      message: 'Successfully cleared cart',
      data: clearedCart,
    });
  } catch (error: any) {
    logger.error(`Error clearing cart: ${error.message || error}`);
    return res.status(500).json({
      message: 'Failed to clear cart',
      error: error.message || error,
    });
  }
};
