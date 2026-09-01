import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.js';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';

export const s3Client = new S3Client({
  region: config.awsRegion,
  ...(config.awsAccessKeyId && config.awsSecretAccessKey
    ? {
        credentials: {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        },
      }
    : {}),
});

export const generatePresignedPreviewUrl = async (
  key: string,
  expiresIn = 3600
): Promise<string> => {
  if (!key) return '';
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error: any) {
    logger.error(`Error generating presigned preview URL for ${key}: ${error.message}`);
    return '';
  }
};

export const generateUploadPresignedUrl = async (
  inputParam: string,
  role = 'buyer',
  expiresIn = 3600
): Promise<{ fileName: string; uploadUrl: string }> => {
  if (!inputParam) return { fileName: '', uploadUrl: '' };
  try {
    const rawExt = inputParam.includes('.') ? inputParam.split('.').pop() : inputParam;
    const fileExtension = (rawExt || 'jpg').toLowerCase().replace(/^\./, '');
    const key = `${role}/${config.s3AvatarImagesFolder}/${uuidv4()}.${fileExtension}`;
    const contentType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: config.s3BucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return { fileName: key, uploadUrl };
  } catch (error: any) {
    logger.error(`Error generating upload presigned URL for ${inputParam}: ${error.message}`);
    return { fileName: '', uploadUrl: '' };
  }
};
