import Item from '../models/item.model.js';
import type { IItem } from '../models/item.model.js';
import type { ItemInput } from '../schemas/item.schema.js';

export class ItemService {
  async getAllItemsPaginated(skip: number, limit: number, category?: string): Promise<{ items: IItem[]; hasNextPage: boolean }> {
    const query = category ? { category } : {};
    const items = await Item.find(query).skip(skip).limit(limit + 1);
    const hasNextPage = items.length > limit;
    const itemsToReturn = hasNextPage ? items.slice(0, limit) : items;
    return { items: itemsToReturn, hasNextPage };
  }

  async createItem(data: ItemInput): Promise<IItem> {
    const newItem = new Item(data);
    return await newItem.save();
  }

  async updateItem(id: string, data: ItemInput): Promise<IItem | null> {
    return await Item.findByIdAndUpdate(id, data, { returnDocument: 'after' });
  }

  async deleteItem(id: string): Promise<IItem | null> {
    return await Item.findByIdAndDelete(id);
  }

  async getItemById(id: string): Promise<IItem | null> {
    return await Item.findById(id);
  }
}

export const itemService = new ItemService();
