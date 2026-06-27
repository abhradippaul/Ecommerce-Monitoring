import Category from '../models/category.model.js';
import type { ICategory } from '../models/category.model.js';
import type { CategoryInput } from '../schemas/category.schema.js';

export class CategoryService {
  async getAllCategories(): Promise<ICategory[]> {
    return await Category.find().sort({ name: 1 });
  }

  async createCategory(data: CategoryInput): Promise<ICategory> {
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } });
    if (existing) {
      return existing;
    }
    const newCategory = new Category(data);
    return await newCategory.save();
  }

  async getCategoryById(id: string): Promise<ICategory | null> {
    return await Category.findById(id);
  }
}

export const categoryService = new CategoryService();
