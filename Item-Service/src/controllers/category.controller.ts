import type { Request, Response } from 'express';
import { categoryService } from '../services/category.service.js';
import logger from '../logger/index.js';
import { categorySchema } from '../schemas/category.schema.js';
import { ZodError } from 'zod';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await categoryService.getAllCategories();
    logger.info('Fetched all categories');
    res.status(200).json({
      message: "Successfully fetched all categories",
      data: categories
    });
  } catch (error: any) {
    logger.error(`Error fetching categories: ${error}`);
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message || error
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const validatedData = categorySchema.parse(req.body);
    const category = await categoryService.createCategory(validatedData);
    logger.info(`Created/Found category: ${category.name}`);
    res.status(201).json({
      message: "Successfully processed category",
      data: category
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      logger.error(`Validation error creating category: ${JSON.stringify(error.issues)}`);
      return res.status(400).json({
        message: "Validation Error",
        error: error.issues
      });
    }
    logger.error(`Error creating category: ${error}`);
    res.status(500).json({
      message: "Failed to create category",
      error: error.message || error
    });
  }
};
