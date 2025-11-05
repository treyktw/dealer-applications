// convex/lib/s3/client.ts
// Centralized S3 client configuration

import { S3Client } from "@aws-sdk/client-s3";

// Validate required environment variables
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucketName) {
  throw new Error("AWS_S3_BUCKET_NAME environment variable is required");
}

if (!accessKeyId || !secretAccessKey) {
  throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required");
}

/**
 * S3 Client
 * Configured with credentials from environment variables
 */
export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  maxAttempts: 3, // Retry failed requests up to 3 times
});

/**
 * S3 Bucket name
 */
export const BUCKET_NAME = bucketName;

/**
 * S3 Region
 */
export const REGION = region;

/**
 * Test S3 connection
 */
export async function testS3Connection(): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`✅ S3 connected: ${BUCKET_NAME} in ${REGION}`);
    return true;
  } catch (error) {
    console.error("❌ S3 connection failed:", error);
    return false;
  }
}
