import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/models/user.model.js', () => {
  const mockUserConstructor = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: 'mock-user-id', ...data }),
  }));

  (mockUserConstructor as any).findOne = jest.fn();
  (mockUserConstructor as any).findById = jest.fn();
  (mockUserConstructor as any).findByIdAndDelete = jest.fn();

  return {
    default: mockUserConstructor,
  };
});

const { AuthService } = await import('../../src/services/auth.service.js');
const UserModule = await import('../../src/models/user.model.js');
const MockUser = UserModule.default as any;

describe('AuthService', () => {
  let service: InstanceType<typeof AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  describe('register', () => {
    it('should create and save a new user', async () => {
      const input = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'buyer' as const,
      };

      const result = await service.register(input as any);

      expect(MockUser).toHaveBeenCalledWith(input);
      expect(result).toMatchObject({ _id: 'mock-user-id', username: 'john_doe' });
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should call User.findOne with $or query', async () => {
      MockUser.findOne.mockResolvedValue({ _id: 'user1', email: 'test@example.com' });

      const user = await service.findByEmailOrUsername('test@example.com', 'testuser', '1234567890');

      expect(MockUser.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }, { username: 'testuser' }, { phoneNumber: '1234567890' }],
      });
      expect(user).toEqual({ _id: 'user1', email: 'test@example.com' });
    });
  });

  describe('findByEmail', () => {
    it('should call User.findOne by email', async () => {
      MockUser.findOne.mockResolvedValue({ _id: 'user1', email: 'test@example.com' });

      const user = await service.findByEmail('test@example.com');

      expect(MockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(user).toEqual({ _id: 'user1', email: 'test@example.com' });
    });
  });

  describe('findById', () => {
    it('should call User.findById', async () => {
      MockUser.findById.mockResolvedValue({ _id: 'user1' });

      const user = await service.findById('user1');

      expect(MockUser.findById).toHaveBeenCalledWith('user1');
      expect(user).toEqual({ _id: 'user1' });
    });
  });

  describe('update', () => {
    it('should update and save existing user fields', async () => {
      const mockSave = jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      });
      const existingUser = {
        _id: 'user1',
        username: 'old',
        email: 'old@example.com',
        save: mockSave,
      };
      MockUser.findById.mockResolvedValue(existingUser);

      const updated = await service.update('user1', { username: 'newname' });

      expect(MockUser.findById).toHaveBeenCalledWith('user1');
      expect(mockSave).toHaveBeenCalled();
      expect(updated?.username).toBe('newname');
    });

    it('should return null if user to update is not found', async () => {
      MockUser.findById.mockResolvedValue(null);

      const updated = await service.update('nonexistent', { username: 'newname' });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when user is deleted', async () => {
      MockUser.findByIdAndDelete.mockResolvedValue({ _id: 'user1' });

      const result = await service.delete('user1');

      expect(MockUser.findByIdAndDelete).toHaveBeenCalledWith('user1');
      expect(result).toBe(true);
    });

    it('should return false when user to delete is not found', async () => {
      MockUser.findByIdAndDelete.mockResolvedValue(null);

      const result = await service.delete('user1');

      expect(result).toBe(false);
    });
  });
});
