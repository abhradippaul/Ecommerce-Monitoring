import express, { type Router } from 'express';
import {
  createPayment,
  getPayment,
  listPayments,
  refundPayment,
} from '../controllers/payment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

router.get('/', authenticateToken, listPayments);
router.post('/', authenticateToken, createPayment);
router.get('/:id', authenticateToken, getPayment);
router.post('/:id/refund', authenticateToken, refundPayment);

export default router;
