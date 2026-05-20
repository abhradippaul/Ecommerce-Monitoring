import { Router } from 'express';
import { register, login, logout, updateUser, deleteUser } from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../utils/types.js';

const router: Router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protect user updates and deletion
router.put('/user/:id', authenticateToken, updateUser);
router.delete('/user/:id', authenticateToken, deleteUser);

// Role-based testing endpoints
router.get('/profile', authenticateToken, (req, res) => {
  res.status(200).json({
    message: "Profile retrieved successfully",
    data: (req as AuthenticatedRequest).user
  });
});

router.get('/admin-only', authenticateToken, requireRole(['admin']), (req, res) => {
  res.status(200).json({
    message: "Welcome, admin! Access granted.",
    data: (req as AuthenticatedRequest).user
  });
});

router.get('/seller-only', authenticateToken, requireRole(['seller']), (req, res) => {
  res.status(200).json({
    message: "Welcome, seller! Access granted.",
    data: (req as AuthenticatedRequest).user
  });
});

router.get('/buyer-only', authenticateToken, requireRole(['buyer']), (req, res) => {
  res.status(200).json({
    message: "Welcome, buyer! Access granted.",
    data: (req as AuthenticatedRequest).user
  });
});

export default router;
