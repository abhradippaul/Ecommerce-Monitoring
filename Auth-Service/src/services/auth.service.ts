import User from '../models/user.model.js';
import type { IUser } from '../models/user.model.js';
import type { RegisterInput, UpdateUserInput } from '../utils/types.js';

export class AuthService {
  async register(data: RegisterInput): Promise<IUser> {
    const user = new User(data);
    return await user.save();
  }

  async findByEmailOrUsername(email: string, username: string, phoneNumber: string): Promise<IUser | null> {
    return await User.findOne({ $or: [{ email }, { username }, { phoneNumber }] });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  async update(id: string, data: UpdateUserInput): Promise<IUser | null> {
    const user = await User.findById(id);
    if (!user) return null;

    if (data.username) user.username = data.username;
    if (data.email) user.email = data.email;
    if (data.password) user.password = data.password;
    if (data.role) user.role = data.role;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;

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

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }
}

export const authService = new AuthService();
