import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { config } from '../utils/config.js';
import type { ProtoCart, ProtoCartItem } from './services/cart.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, '../proto/cart.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = grpc.loadPackageDefinition(packageDefinition) as any;
const CartServiceClient = proto.cart.CartService;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCartGrpcClient(target: string = config.orderServiceGrpcUrl): any {
  return new CartServiceClient(target, grpc.credentials.createInsecure());
}

export function fetchCartByUserId(
  userId: string,
  target: string = config.orderServiceGrpcUrl
): Promise<ProtoCart> {
  const client = getCartGrpcClient(target);
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.getCart({ userId }, (err: grpc.ServiceError | null, response: ProtoCart) => {
      if (err) {
        return reject(err);
      }
      resolve(response);
    });
  });
}

export type { ProtoCart, ProtoCartItem };
