import {
    GetSecretValueCommand,
    SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { config } from "./config.js";

export const getSecretValue = async (secretName = "SECRET_NAME") => {
    const client = new SecretsManagerClient();
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secretName,
        }),
    );

    if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        config.nodeEnv = secrets["NODE_ENV"];
        config.port = secrets["PORT"];
        config.mongoUri = secrets["MONGODB_URI"];
        config.logLevel = secrets["LOG_LEVEL"];
        config.logFile = secrets["LOG_FILE"];
        config.errorFile = secrets["ERROR_FILE"];
        config.accessTokenSecret = secrets["ACCESS_TOKEN_SECRET"];
        config.refreshTokenSecret = secrets["REFRESH_TOKEN_SECRET"];
        config.accessTokenExpiry = secrets["ACCESS_TOKEN_EXPIRY"];
        config.refreshTokenExpiry = secrets["REFRESH_TOKEN_EXPIRY"];
        config.jwtSecret = secrets["JWT_SECRET"];
    }

    if (response.SecretBinary) {
        return response.SecretBinary;
    }
};

