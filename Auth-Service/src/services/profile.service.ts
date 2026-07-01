import User from '../models/user.model.js';
import type { IUser } from '../models/user.model.js';
import { getPresignedPreviewUrl } from '../utils/aws/s3.js';
import type { GetS3PreviewUrlInput, UpdateUserInput, UserRole } from '../utils/types.js';

export class ProfileService {
  async getProfile(id: string, role: UserRole): Promise<IUser | null> {
    if (role === 'buyer') {
      return await User.findOne({ _id: id, role }).select(
        '-password -businessName -storeName -storeDescription -storeLogoUrl'
      );
    }
    if (role === 'seller') {
      return await User.findOne({ _id: id, role }).select('-password');
    }
    return await User.findOne({ _id: id, role }).select('-password');
  }

  async getLimitedProfile(id: string, role: UserRole): Promise<IUser | null> {
    return await User.findOne({ _id: id, role }).select(
      'firstName lastName username email role avatarUrl'
    );
  }

  async getAvatarPreviewUrl(data: GetS3PreviewUrlInput) {
    return await getPresignedPreviewUrl(data);
  }

  async updateProfile(id: string, role: UserRole, data: UpdateUserInput): Promise<IUser | null> {
    const query = role === 'admin' ? { _id: id } : { _id: id, role };
    const user = await User.findOne(query);
    if (!user) return null;

    if (data.username) user.username = data.username;
    if (data.email) user.email = data.email;
    if (data.password) user.password = data.password;
    if (data.role) user.role = data.role;

    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
    if (data.businessName !== undefined) user.businessName = data.businessName;
    if (data.streetAddress !== undefined) user.streetAddress = data.streetAddress;
    if (data.city !== undefined) user.city = data.city;
    if (data.stateProvince !== undefined) user.stateProvince = data.stateProvince;
    if (data.postalCode !== undefined) user.postalCode = data.postalCode;
    if (data.country !== undefined) user.country = data.country;
    if (data.storeName !== undefined) user.storeName = data.storeName;
    if (data.storeDescription !== undefined) user.storeDescription = data.storeDescription;
    if (data.storeLogoUrl !== undefined) user.storeLogoUrl = data.storeLogoUrl;

    return await user.save();
  }

  async deleteProfile(id: string, role: UserRole): Promise<boolean> {
    const query = role === 'admin' ? { _id: id } : { _id: id, role };
    const result = await User.findOneAndDelete(query);
    return !!result;
  }
}

export const profileService = new ProfileService();
