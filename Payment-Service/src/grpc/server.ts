import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import logger from '../utils/logger.js';
import { config } from '../utils/config.js';
import { cartGrpcService } from './services/cart.service.js';

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

export function createGrpcServer(): grpc.Server {
  const server = new grpc.Server();
  server.addService(proto.cart.CartService.service, cartGrpcService);
  return server;
}

export function startGrpcServer(port: number = config.grpcPort): Promise<grpc.Server> {
  const server = createGrpcServer();

  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(), // use createSsl() in production
      (err, boundPort) => {
        if (err) {
          logger.error('Failed to bind gRPC server:', err);
          return reject(err);
        }
        logger.info(`gRPC CartService server listening on 0.0.0.0:${boundPort}`);
        resolve(server);
      }
    );
  });
}
