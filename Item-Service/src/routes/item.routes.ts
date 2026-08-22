import express, { type Router } from 'express';
import { getItems, createItem, updateItem, deleteItem, getItemPresignedUrl, getItemPreviewPresignedUrl } from '../controllers/item.controller.js';

const router: Router = express.Router();

router.get('/', getItems);
router.get('/presigned-url', getItemPresignedUrl);
router.post('/presigned-url/preview', getItemPreviewPresignedUrl);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;
