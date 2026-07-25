import { config } from './config.js';

export const getSecretValue = async (_secretName = 'SECRET_NAME') => {
  // const client = new SecretsManagerClient();
  // const response = await client.send(
  //   new GetSecretValueCommand({
  //     SecretId: secretName,
  //   })
  // );

  // if (response.SecretString) {
  //   const secrets = JSON.parse(response.SecretString);
  //   config.nodeEnv = secrets['NODE_ENV'];
  //   config.port = secrets['PORT'];
  //   config.mongoUri = secrets['MONGODB_URI'];
  //   config.logLevel = secrets['LOG_LEVEL'];
  //   config.logFile = secrets['LOG_FILE'];
  //   config.errorFile = secrets['ERROR_FILE'];
  //   config.accessTokenSecret = secrets['ACCESS_TOKEN_SECRET'];
  //   config.refreshTokenSecret = secrets['REFRESH_TOKEN_SECRET'];
  //   config.accessTokenExpiry = secrets['ACCESS_TOKEN_EXPIRY'];
  //   config.refreshTokenExpiry = secrets['REFRESH_TOKEN_EXPIRY'];
  //   config.jwtSecret = secrets['JWT_SECRET'];
  // }

  // if (response.SecretBinary) {
  //   return response.SecretBinary;
  // }

  const secrets = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_FILE: process.env.LOG_FILE,
    ERROR_FILE: process.env.ERROR_FILE,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
    JWT_SECRET: process.env.JWT_SECRET,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };

  config.nodeEnv = secrets['NODE_ENV']!;
  config.port = Number(secrets['PORT']);
  config.mongoUri = secrets['MONGODB_URI']!;
  config.logLevel = secrets['LOG_LEVEL']!;
  config.logFile = secrets['LOG_FILE']!;
  config.errorFile = secrets['ERROR_FILE']!;
  config.accessTokenSecret = secrets['ACCESS_TOKEN_SECRET']!;
  config.refreshTokenSecret = secrets['REFRESH_TOKEN_SECRET']!;
  config.accessTokenExpiry = secrets['ACCESS_TOKEN_EXPIRY']!;
  config.refreshTokenExpiry = secrets['REFRESH_TOKEN_EXPIRY']!;
  config.jwtSecret = secrets['JWT_SECRET']!;
  config.awsRegion = secrets['AWS_REGION']!;
  config.awsAccessKeyId = secrets['AWS_ACCESS_KEY_ID']!;
  config.awsSecretAccessKey = secrets['AWS_SECRET_ACCESS_KEY']!;
};
