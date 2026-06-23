import { Router } from 'express';
import { register, login, logout, updateUser, deleteUser } from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../utils/types.js';

const router: Router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with a specified username, email, password, and role.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegisterInput'
 *     responses:
 *       201:
 *         description: Successfully registered user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully registered user
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.post('/register', register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     description: Authenticates user credentials and returns access and refresh tokens. Sets HTTP-only cookies.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation or login error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.post('/login', login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out current user
 *     description: Invalidates the user session by clearing authentication tokens.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', logout);

/**
 * @openapi
 * /auth/user/{id}:
 *   put:
 *     summary: Update an existing user
 *     description: Updates the profile of the user identified by ID. Only accessible by the user themselves or an admin.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid request body or update error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       403:
 *         description: Forbidden (insufficient roles or updating another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.put('/user/:id', authenticateToken, updateUser);

/**
 * @openapi
 * /auth/user/{id}:
 *   delete:
 *     summary: Delete a user account
 *     description: Deletes the user account identified by ID. Only accessible by the user themselves or an admin.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to delete.
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       400:
 *         description: Delete error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       403:
 *         description: Forbidden (insufficient roles or deleting another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.delete('/user/:id', authenticateToken, deleteUser);

/**
 * @openapi
 * /auth/admin-only:
 *   get:
 *     summary: Admin test endpoint
 *     description: A test endpoint restricted to users with the 'admin' role.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       403:
 *         description: Forbidden (user does not have admin role)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.get('/admin-only', authenticateToken, requireRole(['admin']), (req, res) => {
  res.status(200).json({
    message: 'Welcome, admin! Access granted.',
    data: (req as AuthenticatedRequest).user,
  });
});

/**
 * @openapi
 * /auth/seller-only:
 *   get:
 *     summary: Seller test endpoint
 *     description: A test endpoint restricted to users with the 'seller' role.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       403:
 *         description: Forbidden (user does not have seller role)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.get('/seller-only', authenticateToken, requireRole(['seller']), (req, res) => {
  res.status(200).json({
    message: 'Welcome, seller! Access granted.',
    data: (req as AuthenticatedRequest).user,
  });
});

/**
 * @openapi
 * /auth/buyer-only:
 *   get:
 *     summary: Buyer test endpoint
 *     description: A test endpoint restricted to users with the 'buyer' role.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 *       403:
 *         description: Forbidden (user does not have buyer role)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericResponse'
 */
router.get('/buyer-only', authenticateToken, requireRole(['buyer']), (req, res) => {
  res.status(200).json({
    message: 'Welcome, buyer! Access granted.',
    data: (req as AuthenticatedRequest).user,
  });
});

export default router;
