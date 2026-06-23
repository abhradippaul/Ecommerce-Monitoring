import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export const config = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'dev',
  appName: process.env.APP_NAME || 'auth-service',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nodejs-monitoring',
  logLevel: process.env.LOG_LEVEL || 'info',
  logToFile: process.env.LOG_TO_FILE !== 'false',
  logFile: process.env.LOG_FILE || 'logs/combined.log',
  errorFile: process.env.ERROR_FILE || 'logs/error.log',
  awsSecretArn: process.env.AWS_SECRET_ARN || '',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || '',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || '',
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '',
  jwtSecret: process.env.JWT_SECRET || '',
  otelCollectorEndpoint: process.env.OTEL_COLLECTOR_ENDPOINT || 'localhost:4318',
  serviceName: process.env.SERVICE_NAME || 'auth-service',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  metrics: {
    httpRequestDurationName: 'http_request_duration_seconds',
    httpRequestDurationHelp: 'Duration of HTTP requests in seconds',
  },
};
