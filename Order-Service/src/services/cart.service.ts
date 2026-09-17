import Cart, { type ICart, type ICartItem } from '../models/cart.model.js';
import type { AddToCartInput, CartItemInput } from '../schemas/cart.schema.js';

export class CartService {
  private recalculateTotals(items: ICartItem[]): { totalPrice: number; totalQuantity: number } {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      totalQuantity,
      totalPrice: Math.round(totalPrice * 100) / 100,
    };
  }

  async getCart(userId: string): Promise<ICart | null> {
    return await Cart.findOne({ userId });
  }

  async getCartCount(
    userId: string
  ): Promise<{ count: number; totalQuantity: number; uniqueItems: number }> {
    const cart = await Cart.findOne({ userId }, 'totalQuantity items');
    if (!cart) {
      return {
        count: 0,
        totalQuantity: 0,
        uniqueItems: 0,
      };
    }
    return {
      count: cart.totalQuantity || 0,
      totalQuantity: cart.totalQuantity || 0,
      uniqueItems: cart.items ? cart.items.length : 0,
    };
  }

  async addItem(userId: string, itemData: AddToCartInput): Promise<ICart> {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalPrice: 0,
        totalQuantity: 0,
      });
    }

    const existingItem = cart.items.find(item => item.productId === itemData.productId);

    if (existingItem) {
      existingItem.quantity += itemData.quantity;
      if (itemData.price !== undefined) existingItem.price = itemData.price;
      if (itemData.name) existingItem.name = itemData.name;
      if (itemData.category) existingItem.category = itemData.category;
      if (itemData.images && itemData.images.length > 0) existingItem.images = itemData.images;
    } else {
      cart.items.push({
        productId: itemData.productId,
        name: itemData.name,
        price: itemData.price,
        quantity: itemData.quantity,
        category: itemData.category || 'General',
        images: itemData.images || [],
      });
    }

    const { totalPrice, totalQuantity } = this.recalculateTotals(cart.items);
    cart.totalPrice = totalPrice;
    cart.totalQuantity = totalQuantity;

    return await cart.save();
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<ICart | null> {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return null;
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(item => item.productId !== productId);
    } else {
      const existingItem = cart.items.find(item => item.productId === productId);
      if (existingItem) {
        existingItem.quantity = quantity;
      }
    }

    const { totalPrice, totalQuantity } = this.recalculateTotals(cart.items);
    cart.totalPrice = totalPrice;
    cart.totalQuantity = totalQuantity;

    return await cart.save();
  }

  async removeItem(userId: string, productId: string): Promise<ICart | null> {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return null;
    }

    cart.items = cart.items.filter(item => item.productId !== productId);

    const { totalPrice, totalQuantity } = this.recalculateTotals(cart.items);
    cart.totalPrice = totalPrice;
    cart.totalQuantity = totalQuantity;

    return await cart.save();
  }

  async syncCart(userId: string, items: CartItemInput[]): Promise<ICart> {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        totalPrice: 0,
        totalQuantity: 0,
      });
    }

    // Consolidate duplicates
    const consolidatedMap = new Map<string, ICartItem>();
    for (const item of items) {
      if (item.quantity <= 0) continue;
      if (consolidatedMap.has(item.productId)) {
        const existing = consolidatedMap.get(item.productId)!;
        existing.quantity += item.quantity;
      } else {
        consolidatedMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category || 'General',
          images: item.images || [],
        });
      }
    }

    cart.items = Array.from(consolidatedMap.values());
    const { totalPrice, totalQuantity } = this.recalculateTotals(cart.items);
    cart.totalPrice = totalPrice;
    cart.totalQuantity = totalQuantity;

    return await cart.save();
  }

  async clearCart(userId: string): Promise<ICart | null> {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return null;
    }

    cart.items = [];
    cart.totalPrice = 0;
    cart.totalQuantity = 0;

    return await cart.save();
  }
}

export const cartService = new CartService();
