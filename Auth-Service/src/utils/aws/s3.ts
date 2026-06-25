import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
import type { GetS3PreviewUrlInput, GetS3UploadUrlInput } from '../types.js';

// Initialize the S3 client using environment variables
const s3Client = new S3Client({
  region: config.awsRegion!,
  credentials: {
    accessKeyId: config.awsAccessKeyId!,
    secretAccessKey: config.awsSecretAccessKey!,
  },
});

async function getPresignedUploadUrl(s3Params: GetS3UploadUrlInput): Promise<string> {
  try {
    const { fileName, expires, contentType, ...otherParams } = s3Params;
    const command = new PutObjectCommand({
      Bucket: config.s3BucketName,
      Key: fileName,
      ...otherParams,
      ContentType: contentType
    });

    // Expires is in seconds (default to 3600 if not specified)
    const expiresIn = expires ? Number(expires) : 3600;

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    throw error;
  }
}

async function getPresignedPreviewUrl(s3Params: GetS3PreviewUrlInput) {
  const { fileName, expires, ...otherParams } = s3Params;
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: fileName,
      ...otherParams,
    });
    // Expires is in seconds (default to 3600 if not specified)
    const expiresIn = expires ? Number(expires) : 3600;
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    throw error;
  }
}

export { s3Client, getPresignedUploadUrl, getPresignedPreviewUrl };
