import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../utils/types.js';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  avatarUrl: string;
  role: UserRole;
  businessName?: string;
  phoneNumber: string;
  streetAddress?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  storeName?: string;
  storeDescription?: string;
  storeLogoUrl?: string;
  comparePassword(password: string): Promise<boolean>;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'seller', 'buyer'], default: 'buyer', required: true },
    businessName: { type: String, default: '' },
    phoneNumber: { type: String, required: true, unique: true },
    streetAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    stateProvince: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
    storeName: { type: String, default: '' },
    storeDescription: { type: String, default: '' },
    storeLogoUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
