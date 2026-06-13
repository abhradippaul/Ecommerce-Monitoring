import express, { type Router } from 'express';
import { getInfo } from '../controllers/info.controller.js';

const router:Router = express.Router();

/**
 * @openapi
 * /info:
 *   get:
 *     summary: Get service info
 *     description: Returns metadata about the service such as service name, version, and current uptime.
 *     tags:
 *       - Info
 *     responses:
 *       200:
 *         description: Successfully retrieved service info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: auth-service
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   example: dev
 *                 uptime:
 *                   type: number
 *                   example: 123.45
 */
router.get('/', getInfo);

export default router;
