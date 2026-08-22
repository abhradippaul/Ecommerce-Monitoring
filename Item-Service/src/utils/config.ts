import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'dev',
  appName: process.env.APP_NAME || 'item-service',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nodejs-monitoring',
  logLevel: process.env.LOG_LEVEL || 'info',
  logToFile: process.env.LOG_TO_FILE !== 'false',
  logFile: process.env.LOG_FILE || 'logs/combined.log',
  errorFile: process.env.ERROR_FILE || 'logs/error.log',
  jwtPublicKeyLocation: process.env.JWT_PUBLIC_KEY_FILE_LOCATION || './keys/public.pem',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  s3BucketName: process.env.S3_BUCKET_NAME || 'ecommerce-monitoring-dev-s3-bucket',
  s3ProductImagesFolder: process.env.S3_PRODUCT_IMAGES_FOLDER || 'product/images',
};
