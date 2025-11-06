// convex/lib/s3/presign.ts
// Presigned URL generation for S3 operations

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "./client";

/**
 * Generate presigned URL for uploading a file (PUT)
 *
 * @param s3Key - S3 key where file will be uploaded
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration in seconds (default: 15 minutes)
 * @returns Presigned upload URL
 */
export async function generateUploadUrl(
  s3Key: string,
  contentType: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  console.log(`📤 Generated upload URL for ${s3Key} (expires in ${expiresIn}s)`);

  return url;
}

/**
 * Generate presigned URL for downloading a file (GET)
 *
 * @param s3Key - S3 key of the file to download
 * @param expiresIn - URL expiration in seconds (default: 5 minutes)
 * @param fileName - Optional filename for Content-Disposition header
 * @returns Presigned download URL
 */
export async function generateDownloadUrl(
  s3Key: string,
  expiresIn: number = 300, // 5 minutes
  fileName?: string
): Promise<string> {
  const commandParams: {
    Bucket: string;
    Key: string;
    ResponseContentDisposition?: string;
  } = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
  };

  // Set Content-Disposition for download with custom filename
  if (fileName) {
    commandParams.ResponseContentDisposition = `attachment; filename="${fileName}"`;
  }

  const command = new GetObjectCommand(commandParams);

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  console.log(`📥 Generated download URL for ${s3Key} (expires in ${expiresIn}s)`);

  return url;
}

/**
 * Generate presigned URL for viewing a file inline (without download)
 *
 * @param s3Key - S3 key of the file to view
 * @param expiresIn - URL expiration in seconds (default: 5 minutes)
 * @returns Presigned view URL
 */
export async function generateViewUrl(
  s3Key: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: "inline",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  console.log(`👁️ Generated view URL for ${s3Key} (expires in ${expiresIn}s)`);

  return url;
}

/**
 * Batch generate download URLs for multiple files
 *
 * @param s3Keys - Array of S3 keys
 * @param expiresIn - URL expiration in seconds
 * @returns Map of s3Key -> presigned URL
 */
export async function batchGenerateDownloadUrls(
  s3Keys: string[],
  expiresIn: number = 300
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};

  await Promise.all(
    s3Keys.map(async (s3Key) => {
      try {
        urls[s3Key] = await generateDownloadUrl(s3Key, expiresIn);
      } catch (error) {
        console.error(`Failed to generate URL for ${s3Key}:`, error);
        urls[s3Key] = ""; // Empty string indicates failure
      }
    })
  );

  return urls;
}
