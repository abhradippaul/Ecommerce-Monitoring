import express, { type Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router:Router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Get service health status
 *     description: Returns the health status of the authentication service and database connection.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 database:
 *                   type: string
 *                   example: connected
 */
router.get('/', getHealth);

export default router;
