import express, { type Router } from 'express';
import { createOrder, getOrders, getOrderById } from '../controllers/order.controller.js';
import cartRoutes from './cart.routes.js';

const router: Router = express.Router();

router.use('/cart', cartRoutes);

router.get('/', getOrders);
router.post('/', createOrder);
router.get('/:id', getOrderById);

export default router;
