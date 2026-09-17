import express, { type Router } from 'express';
import {
  getCart,
  getCartCount,
  addToCart,
  updateCartItem,
  removeCartItem,
  syncCart,
  clearCart,
} from '../controllers/cart.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

router.use(optionalAuth);

router.get('/count', getCartCount);
router.get('/details', getCart);
router.get('/', (req, res) => {
  if (req.query.view === 'count' || req.query.countOnly === 'true') {
    return getCartCount(req, res);
  }
  return getCart(req, res);
});
router.post('/', addToCart);
router.post('/items', addToCart);
router.put('/items/:productId', updateCartItem);
router.delete('/items/:productId', removeCartItem);
router.post('/sync', syncCart);
router.put('/', syncCart);
router.delete('/', clearCart);

export default router;
