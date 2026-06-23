import User from '../models/user.model.js';
import type { IUser } from '../models/user.model.js';
import type { UpdateUserInput, UserRole } from '../utils/types.js';

export class ProfileService {
  async getProfile(id: string, role: UserRole): Promise<IUser | null> {
    return await User.findOne({ _id: id, role });
  }

  async updateProfile(id: string, role: UserRole, data: UpdateUserInput): Promise<IUser | null> {
    const query = role === 'admin' ? { _id: id } : { _id: id, role };
    const user = await User.findOne(query);
    if (!user) return null;

    if (data.username) user.username = data.username;
    if (data.email) user.email = data.email;
    if (data.password) user.password = data.password;
    if (data.role) user.role = data.role;

    return await user.save();
  }

  async deleteProfile(id: string, role: UserRole): Promise<boolean> {
    const query = role === 'admin' ? { _id: id } : { _id: id, role };
    const result = await User.findOneAndDelete(query);
    return !!result;
  }
}

export const profileService = new ProfileService();
