import { S3Client, CreateBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Generate a bucket name for a dealership - updated to match database expectations
export function generateDealershipBucketName(dealershipId: string): string {
  const prefix = process.env.AWS_S3_BUCKET_PREFIX || 'dealership';
  const sanitizedId = dealershipId.replace(/[^a-z0-9-]/g, '-').toLowerCase();
  
  // Format: dealership-{dealershipId}
  // This should match what your database expects in the s3_bucket_name column
  return `${prefix}-${sanitizedId}`;
}

// Initialize directory structure in S3 bucket - updated to use Upload for streams
async function createDirectoryStructure(bucketName: string, dealershipId: string) {
  // Create directory placeholders (empty objects with trailing slashes)
  const directories = [
    `${dealershipId}/`,
    `${dealershipId}/public/`,
    `${dealershipId}/vehicles/`,
    `${dealershipId}/logos/`,
    `${dealershipId}/documents/`,
    `${dealershipId}/profiles/`,
    `${dealershipId}/custom-documents/`
  ];

  // Create each directory placeholder using Upload instead of PutObjectCommand
  for (const dir of directories) {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: dir,
          Body: '', // Empty content for directory placeholders
          ContentType: 'application/x-directory', // Custom content type for directories
        }
      });
      
      await upload.done();
      console.log(`Created directory: ${dir} in bucket ${bucketName}`);
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
      // Continue with other directories even if one fails
    }
  }
}

// Create a new S3 bucket for a dealership - removed the bucket policy that caused the error
export async function createDealershipBucket(dealershipId: string): Promise<string> {
  const bucketName = generateDealershipBucketName(dealershipId);

  try {
    // Create the bucket
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      })
    );

    console.log(`Bucket created: ${bucketName}`);

    // Configure CORS for the bucket
    await s3Client.send(
      new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
              AllowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );

    console.log(`CORS configured for bucket: ${bucketName}`);

    // Create directory structure inside the bucket
    await createDirectoryStructure(bucketName, dealershipId);

    // Return the bucket name as it should be stored in the database
    return bucketName;
  } catch (error) {
    console.error("Error creating dealership bucket:", error);
    throw new Error(`Failed to create dealership bucket: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to get the path for a specific file - unchanged
export function getDealershipFilePath(dealershipId: string, fileType: 'public' | 'vehicles' | 'logos' | 'documents' | 'profiles' | 'custom_documents', fileName: string): string {
  return `${dealershipId}/${fileType}/${fileName}`;
}

// Helper function to get custom document path
export function getCustomDocumentPath(dealershipId: string, dealId: string, fileName: string): string {
  return `${dealershipId}/custom-documents/${dealId}/${fileName}`;
}