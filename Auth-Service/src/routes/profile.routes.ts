import { Router } from 'express';
import { getProfile, getDetailedProfile, updateProfile, deleteProfile, getAvatarPresignedUrl, getPreviewPresignedUrl } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authRateLimit } from '../middleware/rate-limit.middleware.js';

const router: Router = Router();

router.get('/avatar-presigned-url', authRateLimit, authenticateToken, getAvatarPresignedUrl);
router.post('/presigned-url/preview', authRateLimit, getPreviewPresignedUrl);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves the profile details of the currently authenticated user.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: string
 *                       example: 60c72b2f9b1d8b2a3c8e4d56
 *                     username:
 *                       type: string
 *                       example: testuser
 *                     email:
 *                       type: string
 *                       example: testuser@example.com
 *                     role:
 *                       type: string
 *                       example: buyer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
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
router.get('/', authRateLimit, authenticateToken, getProfile);
router.get('/detailed', authRateLimit, authenticateToken, getDetailedProfile);

/**
 * @openapi
 * /auth/profile/{id}:
 *   put:
 *     summary: Update user profile
 *     description: Updates the profile of the user identified by ID. Only accessible by the user themselves or an admin.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user profile to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
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
 *         description: Forbidden (insufficient roles or updating another user's profile)
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
router.put('/:id', authRateLimit, authenticateToken, updateProfile);

/**
 * @openapi
 * /auth/profile/{id}:
 *   delete:
 *     summary: Delete user profile
 *     description: Deletes the user profile identified by ID. Only accessible by the user themselves or an admin.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user profile to delete.
 *     responses:
 *       200:
 *         description: Profile deleted successfully
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
 *         description: Forbidden (insufficient roles or deleting another user's profile)
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
router.delete('/:id', authRateLimit, authenticateToken, deleteProfile);

export default router;
