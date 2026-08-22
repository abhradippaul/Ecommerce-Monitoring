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

jest.unstable_mockModule('../../src/utils/s3Service.js', () => ({
  generatePresignedPreviewUrl: jest.fn(),
  generateUploadPresignedUrl: jest.fn(),
}));

const { ProfileService } = await import('../../src/services/profile.service.js');
const UserModule = await import('../../src/models/user.model.js');
const s3ServiceModule = await import('../../src/utils/s3Service.js');

const MockUser = UserModule.default as any;
const mockGeneratePresignedPreviewUrl = s3ServiceModule.generatePresignedPreviewUrl as jest.Mock;
const mockGenerateUploadPresignedUrl = s3ServiceModule.generateUploadPresignedUrl as jest.Mock;

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
      expect(mockGeneratePresignedPreviewUrl).not.toHaveBeenCalled();
    });

    it('should call generatePresignedPreviewUrl when fileName is provided', async () => {
      mockGeneratePresignedPreviewUrl.mockResolvedValue('http://preview.url/avatar.png');

      const url = await service.getAvatarPreviewUrl('avatar.png');

      expect(mockGeneratePresignedPreviewUrl).toHaveBeenCalledWith('avatar.png');
      expect(url).toBe('http://preview.url/avatar.png');
    });
  });

  describe('getAvatarPresignedUrl', () => {
    it('should return empty objects if fileName is empty', async () => {
      const res = await service.getAvatarPresignedUrl('', 'buyer');
      expect(res).toEqual({ fileName: '', uploadUrl: '' });
    });

    it('should call generateUploadPresignedUrl helper when fileName is provided', async () => {
      mockGenerateUploadPresignedUrl.mockResolvedValue({
        fileName: 'buyer/avatars/uuid.png',
        uploadUrl: 'http://s3.amazonaws.com/upload-presigned',
      });

      const res = await service.getAvatarPresignedUrl('avatar.png', 'buyer');

      expect(mockGenerateUploadPresignedUrl).toHaveBeenCalledWith('avatar.png', 'buyer');
      expect(res).toEqual({
        fileName: 'buyer/avatars/uuid.png',
        uploadUrl: 'http://s3.amazonaws.com/upload-presigned',
      });
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
