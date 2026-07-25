import path from 'path';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import logger from './logger.js';
import { resolveProtoPath } from './protoResolver.js';

const PROTO_PATH = resolveProtoPath('file.proto');

let fileClient: any = null;

try {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const filePackage = (grpc.loadPackageDefinition(packageDefinition) as any).filePackage;
  const fileServiceHost = process.env.FILE_SERVICE_GRPC_HOST || '127.0.0.1:50052';

  if (filePackage?.FileService) {
    fileClient = new filePackage.FileService(
      fileServiceHost,
      grpc.credentials.createInsecure()
    );
    logger.info(`File-Service gRPC client connected to ${fileServiceHost}`);
  }
} catch (error) {
  logger.error('Failed to initialize File-Service gRPC client:', error);
}

export const getAvatarFilePreview = (fileName: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!fileClient) {
      logger.warn('File-Service gRPC client not initialized');
      return resolve('');
    }

    fileClient.GetAvatarFilePreview({ fileName }, (err: any, response: any) => {
      if (err) {
        logger.error(`gRPC GetAvatarFilePreview error: ${err.message}`);
        return resolve('');
      }
      resolve(response?.previewUrl || '');
    });
  });
};
