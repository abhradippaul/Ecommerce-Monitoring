import type { Request, Response } from 'express';
import { orderService } from '../services/order.service.js';
import logger from '../logger/index.js';
import { orderSchema } from '../schemas/order.schema.js';
import { ZodError } from 'zod';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const validatedData = orderSchema.parse(req.body);
    const newOrder = await orderService.createOrder(validatedData);

    logger.info(`Created new order: ${newOrder._id}`);
    res.status(201).json({
      message: 'Successfully created order',
      data: newOrder,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      logger.error(`Validation error creating order: ${JSON.stringify(error.issues)}`);
      return res.status(400).json({
        message: 'Validation Error',
        error: error.issues,
      });
    }

    if (error.message && error.message.includes('not found')) {
      logger.warn(`Item not found for order: ${error.message}`);
      return res.status(404).json({
        message: 'Item not found',
        error: error.message,
      });
    }

    logger.error(`Error creating order: ${error}`);
    res.status(500).json({
      message: 'Failed to create order',
      error: error.message || error,
    });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getAllOrders();
    logger.info('Fetched all orders');
    res.status(200).json({
      message: 'Successfully fetched all orders',
      data: orders,
    });
  } catch (error: any) {
    logger.error(`Error fetching orders: ${error}`);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message || error,
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        message: 'Invalid Order ID',
        error: 'ID is required and must be a string',
      });
    }

    const order = await orderService.getOrderById(id);
    if (!order) {
      logger.warn(`Order not found: ${id}`);
      return res.status(404).json({
        message: 'Order not found',
        data: null,
      });
    }
    logger.info(`Fetched order: ${id}`);
    res.status(200).json({
      message: 'Successfully fetched order',
      data: order,
    });
  } catch (error: any) {
    logger.error(`Error fetching order ${req.params.id}: ${error}`);
    res.status(500).json({
      message: 'Failed to fetch order',
      error: error.message || error,
    });
  }
};
