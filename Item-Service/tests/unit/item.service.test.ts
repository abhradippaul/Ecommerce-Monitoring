import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/models/item.model.js', () => {
  const mockItemConstructor = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: 'item123', ...data }),
  }));

  (mockItemConstructor as any).find = jest.fn();
  (mockItemConstructor as any).findById = jest.fn();
  (mockItemConstructor as any).findByIdAndUpdate = jest.fn();
  (mockItemConstructor as any).findByIdAndDelete = jest.fn();

  return {
    default: mockItemConstructor,
  };
});

const { ItemService } = await import('../../src/services/item.service.js');
const ItemModule = await import('../../src/models/item.model.js');
const MockItem = ItemModule.default as any;

describe('ItemService', () => {
  let service: InstanceType<typeof ItemService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ItemService();
  });

  describe('createItem', () => {
    it('should save and return a new item', async () => {
      const itemData = { title: 'Test Laptop', price: 999, category: 'Electronics' };
      const created = await service.createItem(itemData as any);

      expect(MockItem).toHaveBeenCalledWith(itemData);
      expect(created).toMatchObject({ _id: 'item123', title: 'Test Laptop' });
    });
  });

  describe('getAllItemsPaginated', () => {
    it('should return items with hasNextPage=true when items length exceeds limit', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { _id: '1', title: 'Item 1' },
          { _id: '2', title: 'Item 2' },
          { _id: '3', title: 'Item 3' },
        ]),
      };
      MockItem.find.mockReturnValue(mockQuery);

      const result = await service.getAllItemsPaginated(0, 2, 'Electronics');

      expect(MockItem.find).toHaveBeenCalledWith({ category: 'Electronics' });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it('should return items with hasNextPage=false when items length is within limit', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { _id: '1', title: 'Item 1' },
        ]),
      };
      MockItem.find.mockReturnValue(mockQuery);

      const result = await service.getAllItemsPaginated(0, 10);

      expect(MockItem.find).toHaveBeenCalledWith({});
      expect(result.hasNextPage).toBe(false);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getItemById', () => {
    it('should find item by ID', async () => {
      MockItem.findById.mockResolvedValue({ _id: 'item123', title: 'Test Phone' });

      const item = await service.getItemById('item123');

      expect(MockItem.findById).toHaveBeenCalledWith('item123');
      expect(item).toEqual({ _id: 'item123', title: 'Test Phone' });
    });
  });

  describe('updateItem', () => {
    it('should update item by ID', async () => {
      const updateData = { title: 'Updated Phone' };
      MockItem.findByIdAndUpdate.mockResolvedValue({ _id: 'item123', ...updateData });

      const updated = await service.updateItem('item123', updateData as any);

      expect(MockItem.findByIdAndUpdate).toHaveBeenCalledWith('item123', updateData, {
        returnDocument: 'after',
      });
      expect(updated).toEqual({ _id: 'item123', title: 'Updated Phone' });
    });
  });

  describe('deleteItem', () => {
    it('should delete item by ID', async () => {
      MockItem.findByIdAndDelete.mockResolvedValue({ _id: 'item123' });

      const deleted = await service.deleteItem('item123');

      expect(MockItem.findByIdAndDelete).toHaveBeenCalledWith('item123');
      expect(deleted).toEqual({ _id: 'item123' });
    });
  });
});
