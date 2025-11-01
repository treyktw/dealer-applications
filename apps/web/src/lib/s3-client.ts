import { S3Client } from "@aws-sdk/client-s3";

if(!process.env.AWS_REGION) {
 throw Error("No AWS Region key")
}

if(!process.env.AWS_ACCESS_KEY_ID) {
  throw Error("No AWS Access key Id")
}

if(!process.env.AWS_SECRET_ACCESS_KEY) {
  throw Error("No AWS Secret Access Key")
}

if(!process.env.AWS_S3_BUCKET_NAME) {
  throw Error("No AWS Bucket Name")
}

// S3 Configuration
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
