import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  name: string;
  sku?: string;
  category?: string;
  brand?: string;
  description?: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  images?: string[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  color?: string;
  size?: string;
  material?: string;
  shippingCharges?: number;
  returnPolicy?: string;
  warrantyInfo?: string;
}

const ItemSchema: Schema = new Schema({
  name: { type: String, required: true },
  sku: { type: String },
  category: { type: String },
  brand: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  quantity: { type: Number, required: true },
  images: [{ type: String }],
  weight: { type: Number },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number }
  },
  color: { type: String },
  size: { type: String },
  material: { type: String },
  shippingCharges: { type: Number },
  returnPolicy: { type: String },
  warrantyInfo: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.model<IItem>('Item', ItemSchema);
