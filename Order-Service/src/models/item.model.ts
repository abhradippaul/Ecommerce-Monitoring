import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  name: string;
  quantity: number;
  price: number;
}

const ItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model<IItem>('Item', ItemSchema);
