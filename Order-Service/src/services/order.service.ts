import Order from '../models/order.model.js';
import type { IOrder } from '../models/order.model.js';
import Item from '../models/item.model.js';
import type { OrderInput } from '../schemas/order.schema.js';

export class OrderService {
  async createOrder(data: OrderInput): Promise<IOrder> {
    let totalPrice = 0;
    for (const itemData of data.items) {
      const item = await Item.findById(itemData.item);
      if (!item) {
        throw new Error(`Item with id ${itemData.item} not found`);
      }
      totalPrice += item.price * itemData.quantity;
    }

    const newOrder = new Order({
      ...data,
      totalPrice,
    });

    return await newOrder.save();
  }

  async getAllOrders(): Promise<IOrder[]> {
    return await Order.find().populate('items.item');
  }

  async getOrderById(id: string): Promise<IOrder | null> {
    return await Order.findById(id).populate('items.item');
  }
}

export const orderService = new OrderService();
