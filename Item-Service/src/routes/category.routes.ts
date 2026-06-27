import express, { type Router } from 'express';
import { getCategories, createCategory } from '../controllers/category.controller.js';

const router: Router = express.Router();

router.get('/', getCategories);
router.post('/', createCategory);

export default router;
