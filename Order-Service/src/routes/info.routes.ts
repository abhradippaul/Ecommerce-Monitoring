import express, { type Router } from 'express';
import { getInfo } from '../controllers/info.controller.js';

const router: Router = express.Router();

router.get('/', getInfo);

export default router;
