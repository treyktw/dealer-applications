// src/lib/s3.ts

import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";

// S3 client configuration
export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Bucket name
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// Function to generate a unique key for the S3 object
export const generateKey = (filename: string): string => {
  const fileExtension = filename.split('.').pop();
  return `uploads/${uuidv4()}.${fileExtension}`;
};

// Function to directly upload a file to S3
export const uploadFileToS3 = async (
  file: File,
  key?: string
): Promise<{ url: string; key: string }> => {
  const fileKey = key || generateKey(file.name);
  
  try {
    // Create a multipart upload
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: file,
        ContentType: file.type,
      },
    });

    // Execute the upload
    await upload.done();
    
    // Construct the object URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    
    return { url, key: fileKey };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

export async function generatePresignedUrl(
  filename: string, 
  contentType: string, 
  dealershipId: string,
  category: string = 'vehicles',
  objectId?: string // Optional ID (e.g., vehicleId)
): Promise<{ url: string; key: string }> {
  try {
    // Generate a unique filename to avoid collisions
    const fileExtension = filename.split('.').pop();
    const uniqueId = nanoid();
    const sanitizedFilename = `${uniqueId}-${Date.now()}.${fileExtension}`;
    
    // Construct the key with the dealership directory structure
    // If objectId is provided, use it as a subfolder
    const key = objectId 
      ? `${dealershipId}/${category}/${objectId}/${sanitizedFilename}`
      : `${dealershipId}/${category}/${sanitizedFilename}`;
    
    // Create the command for generating a presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    
    // Generate the presigned URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    
    console.log("Generated presigned URL:", {
      bucket: process.env.AWS_S3_BUCKET_NAME,
      key,
      url: url.substring(0, 100) + "..." // Log truncated URL for security
    });
    
    return { url, key };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

// Generate a presigned URL for viewing/downloading private objects
export const getObjectSignedUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  try {
    // Generate a URL that expires in 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Error generating signed URL for object:", error);
    throw error;
  }
};