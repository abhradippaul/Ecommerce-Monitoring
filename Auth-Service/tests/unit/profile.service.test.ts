import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/models/user.model.js', () => {
  const mockUserConstructor = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ _id: 'mock-user-id', ...data }),
  }));

  (mockUserConstructor as any).findOne = jest.fn();
  (mockUserConstructor as any).findOneAndDelete = jest.fn();

  return {
    default: mockUserConstructor,
  };
});

jest.unstable_mockModule('../../src/utils/fileGrpcClient.js', () => ({
  getAvatarFilePreview: jest.fn(),
}));

const { ProfileService } = await import('../../src/services/profile.service.js');
const UserModule = await import('../../src/models/user.model.js');
const fileGrpcClientModule = await import('../../src/utils/fileGrpcClient.js');

const MockUser = UserModule.default as any;
const mockGetAvatarFilePreview = fileGrpcClientModule.getAvatarFilePreview as jest.Mock;

describe('ProfileService', () => {
  let service: InstanceType<typeof ProfileService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService();
  });

  describe('getProfile', () => {
    it('should query user profile and chain select for buyer', async () => {
      const mockSelect = jest.fn().mockResolvedValue({ _id: 'buyer1', role: 'buyer' });
      MockUser.findOne.mockReturnValue({ select: mockSelect });

      const profile = await service.getProfile('buyer1', 'buyer');

      expect(MockUser.findOne).toHaveBeenCalledWith({ _id: 'buyer1', role: 'buyer' });
      expect(mockSelect).toHaveBeenCalledWith(
        '-password -businessName -storeName -storeDescription -storeLogoUrl'
      );
      expect(profile).toEqual({ _id: 'buyer1', role: 'buyer' });
    });

    it('should query user profile and chain select for seller', async () => {
      const mockSelect = jest.fn().mockResolvedValue({ _id: 'seller1', role: 'seller' });
      MockUser.findOne.mockReturnValue({ select: mockSelect });

      const profile = await service.getProfile('seller1', 'seller');

      expect(MockUser.findOne).toHaveBeenCalledWith({ _id: 'seller1', role: 'seller' });
      expect(mockSelect).toHaveBeenCalledWith('-password');
      expect(profile).toEqual({ _id: 'seller1', role: 'seller' });
    });
  });

  describe('getLimitedProfile', () => {
    it('should select limited fields', async () => {
      const mockSelect = jest.fn().mockResolvedValue({ _id: 'user1', username: 'john' });
      MockUser.findOne.mockReturnValue({ select: mockSelect });

      const profile = await service.getLimitedProfile('user1', 'buyer');

      expect(MockUser.findOne).toHaveBeenCalledWith({ _id: 'user1', role: 'buyer' });
      expect(mockSelect).toHaveBeenCalledWith('firstName lastName username email role avatarUrl');
      expect(profile).toEqual({ _id: 'user1', username: 'john' });
    });
  });

  describe('getAvatarPreviewUrl', () => {
    it('should return empty string if fileName is falsy', async () => {
      const url = await service.getAvatarPreviewUrl('');
      expect(url).toBe('');
      expect(mockGetAvatarFilePreview).not.toHaveBeenCalled();
    });

    it('should call getAvatarFilePreview when fileName is provided', async () => {
      mockGetAvatarFilePreview.mockResolvedValue('http://preview.url/avatar.png');

      const url = await service.getAvatarPreviewUrl('avatar.png');

      expect(mockGetAvatarFilePreview).toHaveBeenCalledWith('avatar.png');
      expect(url).toBe('http://preview.url/avatar.png');
    });
  });

  describe('updateProfile', () => {
    it('should update profile for user', async () => {
      const mockSave = jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      });
      const userDoc = { _id: 'user1', role: 'buyer', save: mockSave };
      MockUser.findOne.mockResolvedValue(userDoc);

      const updated = await service.updateProfile('user1', 'buyer', { username: 'newname' });

      expect(MockUser.findOne).toHaveBeenCalledWith({ _id: 'user1', role: 'buyer' });
      expect(mockSave).toHaveBeenCalled();
      expect(updated?.username).toBe('newname');
    });

    it('should return null if user to update is not found', async () => {
      MockUser.findOne.mockResolvedValue(null);

      const updated = await service.updateProfile('user1', 'buyer', { username: 'newname' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    it('should delete user profile', async () => {
      MockUser.findOneAndDelete.mockResolvedValue({ _id: 'user1' });

      const res = await service.deleteProfile('user1', 'buyer');

      expect(MockUser.findOneAndDelete).toHaveBeenCalledWith({ _id: 'user1', role: 'buyer' });
      expect(res).toBe(true);
    });
  });
});
