import Item from '../models/item.model.js';
import type { IItem } from '../models/item.model.js';
import type { ItemInput } from '../schemas/item.schema.js';

import { generatePresignedPreviewUrl } from '../utils/s3Service.js';

export class ItemService {
  private async populateImagePreviewUrls(item: IItem): Promise<IItem> {
    const itemObj = item.toObject ? item.toObject() : item;
    if (itemObj.images && itemObj.images.length > 0) {
      itemObj.images = await Promise.all(
        itemObj.images.map(async (img: string) => {
          if (!img) return img;
          if (img.startsWith('http')) return img;
          const previewUrl = await generatePresignedPreviewUrl(img);
          return previewUrl || img;
        })
      );
    }
    return itemObj;
  }

  async getAllItemsPaginated(skip: number, limit: number, category?: string, sortBy?: string): Promise<{ items: IItem[]; hasNextPage: boolean }> {
    const query = category ? { category } : {};
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === 'price-asc') sortOptions = { price: 1 };
    else if (sortBy === 'price-desc') sortOptions = { price: -1 };
    else if (sortBy === 'sales-desc') sortOptions = { quantity: 1 };

    const items = await Item.find(query).sort(sortOptions).skip(skip).limit(limit + 1);
    const hasNextPage = items.length > limit;
    const rawItems = hasNextPage ? items.slice(0, limit) : items;

    const itemsToReturn = await Promise.all(
      rawItems.map((item) => this.populateImagePreviewUrls(item))
    );

    return { items: itemsToReturn, hasNextPage };
  }

  async createItem(data: ItemInput): Promise<IItem> {
    const newItem = new Item(data);
    const saved = await newItem.save();
    return await this.populateImagePreviewUrls(saved);
  }

  async updateItem(id: string, data: ItemInput): Promise<IItem | null> {
    const updated = await Item.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    return updated ? await this.populateImagePreviewUrls(updated) : null;
  }

  async deleteItem(id: string): Promise<IItem | null> {
    return await Item.findByIdAndDelete(id);
  }

  async getItemById(id: string): Promise<IItem | null> {
    const item = await Item.findById(id);
    return item ? await this.populateImagePreviewUrls(item) : null;
  }
}

export const itemService = new ItemService();
