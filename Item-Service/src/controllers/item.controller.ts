import type { Request, Response } from 'express';
import { itemService } from '../services/item.service.js';
import logger from '../logger/index.js';
import { itemSchema } from '../schemas/item.schema.js';
import { ZodError } from 'zod';

import { generateUploadPresignedUrl, generatePresignedPreviewUrl } from '../utils/s3Service.js';

export const getItems = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    const category = req.query.category as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;

    const skip = (page - 1) * limit;
    const { items, hasNextPage } = await itemService.getAllItemsPaginated(skip, limit, category, sortBy);
    logger.info(`Fetched items page ${page} with limit ${limit} for category ${category} and sortBy ${sortBy}`);

    return res.status(200).json({
      message: "Successfully fetched the items",
      data: {
        items,
        page,
        limit,
        hasNextPage
      }
    });
  } catch (error: any) {
    logger.error(`Error fetching items: ${error}`);
    res.status(500).json({
      message: "Failed to fetch all the items",
      error: error.message || error
    });
  }
};

export const getItemPresignedUrl = async (req: Request, res: Response) => {
  try {
    const fileExtension = (req.query.fileExtension as string) || (req.query.extension as string) || (req.query.fileName as string);
    if (!fileExtension) {
      return res.status(400).json({
        message: "fileExtension or fileName query parameter is required",
        error: "Missing fileExtension"
      });
    }

    const result = await generateUploadPresignedUrl(fileExtension);
    if (!result.uploadUrl) {
      return res.status(500).json({
        message: "Failed to generate presigned upload URL",
        error: "Presigned URL generation failed"
      });
    }

    return res.status(200).json({
      message: "Successfully generated item upload presigned URL",
      data: result
    });
  } catch (error: any) {
    logger.error(`Error generating item presigned URL: ${error}`);
    res.status(500).json({
      message: "Failed to generate presigned URL",
      error: error.message || error
    });
  }
};

export const getItemPreviewPresignedUrl = async (req: Request, res: Response) => {
  try {
    const fileName = req.body?.file_name || req.body?.fileName || req.query.file_name || req.query.fileName;
    if (!fileName) {
      return res.status(400).json({
        message: "file_name is required",
        error: "Missing file_name"
      });
    }

    const preview_url = await generatePresignedPreviewUrl(fileName as string);
    if (!preview_url) {
      return res.status(500).json({
        message: "Failed to generate presigned preview URL",
        error: "Presigned preview URL generation failed"
      });
    }

    return res.status(200).json({
      file_name: fileName,
      preview_url
    });
  } catch (error: any) {
    logger.error(`Error generating item preview presigned URL: ${error}`);
    res.status(500).json({
      message: "Failed to generate presigned preview URL",
      error: error.message || error
    });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const validatedData = itemSchema.parse(req.body);
    const newItem = await itemService.createItem(validatedData);
    logger.info(`Created new item: ${validatedData.name}`);
    res.status(201).json({
      message: "Successfully created item",
      data: newItem
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      logger.error(`Validation error creating item: ${JSON.stringify(error.issues)}`);
      return res.status(400).json({
        message: "Validation Error",
        error: error.issues
      });
    }
    logger.error(`Error creating item: ${error}`);
    res.status(500).json({
      message: "Failed to create item",
      error: error.message || error
    });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        message: "Invalid Item ID",
        error: "ID is required and must be a string"
      });
    }

    const validatedData = itemSchema.parse(req.body);
    const updatedItem = await itemService.updateItem(id, validatedData);

    if (!updatedItem) {
      logger.warn(`Item not found for update: ${id}`);
      return res.status(404).json({
        message: "Item not found",
        data: null
      });
    }
    logger.info(`Updated item: ${id}`);
    res.status(200).json({
      message: "Successfully updated item",
      data: updatedItem
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      logger.error(`Validation error updating item ${req.params.id}: ${JSON.stringify(error.issues)}`);
      return res.status(400).json({
        message: "Validation Error",
        error: error.issues
      });
    }
    logger.error(`Error updating item ${req.params.id}: ${error}`);
    res.status(500).json({
      message: "Failed to update item",
      error: error.message || error
    });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        message: "Invalid Item ID",
        error: "ID is required and must be a string"
      });
    }

    const deletedItem = await itemService.deleteItem(id);
    if (!deletedItem) {
      logger.warn(`Item not found for deletion: ${id}`);
      return res.status(404).json({
        message: "Item not found",
        data: null
      });
    }
    logger.info(`Deleted item: ${id}`);
    res.status(200).json({
      message: "Successfully deleted item",
      data: deletedItem
    });
  } catch (error: any) {
    logger.error(`Error deleting item ${req.params.id}: ${error}`);
    res.status(500).json({
      message: "Failed to delete item",
      error: error.message || error
    });
  }
};
