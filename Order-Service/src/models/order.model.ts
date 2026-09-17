import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  items: {
    item: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  totalPrice: number;
  status: 'pending' | 'completed' | 'cancelled';
}

const OrderSchema: Schema = new Schema(
  {
    items: [
      {
        item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
