import express, { type Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router: Router = express.Router();

router.get('/', getHealth);

export default router;
