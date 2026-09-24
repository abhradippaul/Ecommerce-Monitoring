import type * as grpc from '@grpc/grpc-js';
import logger from '../../utils/logger.js';

export interface ProtoCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  images?: string[];
}

export interface ProtoCart {
  id: string;
  userId: string;
  items: ProtoCartItem[];
  totalPrice: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetCartRequest {
  userId: string;
}

export const cartGrpcService = {
  getCart: (
    call: grpc.ServerUnaryCall<GetCartRequest, ProtoCart>,
    callback: grpc.sendUnaryData<ProtoCart>
  ): void => {
    try {
      const { userId } = call.request;
      logger.info('gRPC GetCart request received', { userId });

      if (!userId) {
        return callback({
          code: 3, // grpc.status.INVALID_ARGUMENT
          message: 'userId is required',
        });
      }

      // Default cart response conforming to cart.proto / ICart schema
      const cartResponse: ProtoCart = {
        id: '',
        userId,
        items: [],
        totalPrice: 0,
        totalQuantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      callback(null, cartResponse);
    } catch (error: unknown) {
      logger.error('Error handling gRPC GetCart:', error);
      callback({
        code: 13, // grpc.status.INTERNAL
        message: 'Internal server error while fetching cart',
      });
    }
  },

  listCarts: (call: grpc.ServerWritableStream<unknown, ProtoCart>): void => {
    logger.info('gRPC ListCarts request received');
    call.end();
  },
};
