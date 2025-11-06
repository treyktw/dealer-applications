// convex/lib/s3/operations.ts
// High-level S3 operations (delete, copy, list, etc.)

import { DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "./client";

/**
 * Delete a file from S3
 */
export async function deleteFile(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);

  console.log(`🗑️ Deleted file: ${s3Key}`);
}

/**
 * Delete multiple files from S3
 */
export async function deleteFiles(s3Keys: string[]): Promise<void> {
  await Promise.all(s3Keys.map((s3Key) => deleteFile(s3Key)));

  console.log(`🗑️ Deleted ${s3Keys.length} files`);
}

/**
 * Copy a file within S3
 */
export async function copyFile(sourceKey: string, destinationKey: string): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${sourceKey}`,
    Key: destinationKey,
  });

  await s3Client.send(command);

  console.log(`📋 Copied file: ${sourceKey} → ${destinationKey}`);
}

/**
 * Check if a file exists in S3
 */
export async function fileExists(s3Key: string): Promise<boolean> {
  try {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      })
    );
    return true;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      ("name" in error && error.name === "NotFound" ||
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata &&
      error.$metadata.httpStatusCode === 404)
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * List all files in a prefix (directory)
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const files: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          files.push(object.Key);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`📁 Listed ${files.length} files in prefix: ${prefix}`);

  return files;
}

/**
 * Get file size in bytes
 */
export async function getFileSize(s3Key: string): Promise<number> {
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  return response.ContentLength || 0;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(s3Key: string): Promise<{
  size: number;
  contentType: string | undefined;
  lastModified: Date | undefined;
  etag: string | undefined;
}> {
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  return {
    size: response.ContentLength || 0,
    contentType: response.ContentType,
    lastModified: response.LastModified,
    etag: response.ETag,
  };
}
