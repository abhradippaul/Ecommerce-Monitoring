import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/models/category.model.js', () => {
  const mockCategoryConstructor = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: 'cat123', ...data }),
  }));

  (mockCategoryConstructor as any).find = jest.fn();
  (mockCategoryConstructor as any).findOne = jest.fn();
  (mockCategoryConstructor as any).findById = jest.fn();

  return {
    default: mockCategoryConstructor,
  };
});

const { CategoryService } = await import('../../src/services/category.service.js');
const CategoryModule = await import('../../src/models/category.model.js');
const MockCategory = CategoryModule.default as any;

describe('CategoryService', () => {
  let service: InstanceType<typeof CategoryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryService();
  });

  describe('getAllCategories', () => {
    it('should return all categories sorted by name', async () => {
      const mockSelect = jest.fn().mockResolvedValue([{ _id: 'cat1', name: 'Electronics' }]);
      const mockSort = jest.fn().mockReturnValue({ select: mockSelect });
      MockCategory.find.mockReturnValue({ sort: mockSort });

      const categories = await service.getAllCategories();

      expect(MockCategory.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ name: 1 });
      expect(mockSelect).toHaveBeenCalledWith({ name: 1 });
      expect(categories).toEqual([{ _id: 'cat1', name: 'Electronics' }]);
    });
  });

  describe('createCategory', () => {
    it('should return existing category if name matches case-insensitively', async () => {
      MockCategory.findOne.mockResolvedValue({ _id: 'cat1', name: 'Books' });

      const res = await service.createCategory({ name: 'books' } as any);

      expect(MockCategory.findOne).toHaveBeenCalled();
      expect(res).toEqual({ _id: 'cat1', name: 'Books' });
      expect(MockCategory).not.toHaveBeenCalled();
    });

    it('should create and save a new category if not found', async () => {
      MockCategory.findOne.mockResolvedValue(null);
      const data = { name: 'Books' };

      const created = await service.createCategory(data as any);

      expect(MockCategory).toHaveBeenCalledWith(data);
      expect(created).toMatchObject({ _id: 'cat123', name: 'Books' });
    });
  });

  describe('getCategoryById', () => {
    it('should return category by ID', async () => {
      MockCategory.findById.mockResolvedValue({ _id: 'cat123', name: 'Books' });

      const category = await service.getCategoryById('cat123');

      expect(MockCategory.findById).toHaveBeenCalledWith('cat123');
      expect(category).toEqual({ _id: 'cat123', name: 'Books' });
    });
  });
});
