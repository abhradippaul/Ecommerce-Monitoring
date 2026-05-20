import User from '../models/user.model.js';
import type { IUser } from '../models/user.model.js';
import type { RegisterInput, UpdateUserInput } from '../utils/types.js';

export class AuthService {
  async register(data: RegisterInput): Promise<IUser> {
    const user = new User(data);
    return await user.save();
  }

  async findByEmailOrUsername(email: string, username: string): Promise<IUser | null> {
    return await User.findOne({ $or: [{ email }, { username }] });
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

    return await user.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }
}

export const authService = new AuthService();
