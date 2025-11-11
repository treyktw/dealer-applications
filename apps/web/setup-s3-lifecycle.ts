/**
 * S3 Lifecycle Policy Setup Script
 *
 * This script configures S3 lifecycle policies for automated cleanup of temporary files.
 * Note: Deal-specific cleanup is handled by Convex scheduled jobs based on deal status.
 *
 * Lifecycle rules:
 * - Delete incomplete multipart uploads after 7 days
 * - Clean up temporary upload files after 1 day
 * - Archive old logs after 90 days (if applicable)
 *
 * Usage:
 *   npx tsx scripts/setup-s3-lifecycle.ts
 *   OR
 *   node scripts/setup-s3-lifecycle.js (if compiled)
 */

import { BUCKET_NAME, s3Client } from "@/lib/s3-client";
import {
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
  type BucketLifecycleConfiguration,
} from "@aws-sdk/client-s3";

// Load environment variables from process.env (ensure .env.local is loaded)
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME) {
  console.error("❌ Missing required environment variables:");
  console.error("   - AWS_REGION");
  console.error("   - AWS_ACCESS_KEY_ID");
  console.error("   - AWS_SECRET_ACCESS_KEY");
  console.error("   - AWS_S3_BUCKET_NAME");
  console.error("\nPlease set these in your .env.local file");
  process.exit(1);
}


async function setupLifecyclePolicies() {
  console.log(`Setting up lifecycle policies for bucket: ${BUCKET_NAME}`);

  const lifecycleConfiguration: BucketLifecycleConfiguration = {
    Rules: [
      {
        ID: "cleanup-incomplete-multipart-uploads",
        Status: "Enabled",
        Filter: {},
        AbortIncompleteMultipartUpload: {
          DaysAfterInitiation: 7,
        },
      },
      {
        ID: "cleanup-temporary-files",
        Status: "Enabled",
        Filter: {
          Prefix: "temp/",
        },
        Expiration: {
          Days: 1,
        },
      },
      {
        ID: "cleanup-logs",
        Status: "Enabled",
        Filter: {
          Prefix: "logs/",
        },
        Transitions: [
          {
            Days: 90,
            StorageClass: "GLACIER",
          },
        ],
        Expiration: {
          Days: 365,
        },
      },
    ],
  };

  try {
    // Check if lifecycle configuration exists
    try {
      const getCommand = new GetBucketLifecycleConfigurationCommand({
        Bucket: BUCKET_NAME,
      });
      const existing = await s3Client.send(getCommand);
      console.log("Existing lifecycle configuration:", JSON.stringify(existing, null, 2));
    } catch (error) {
      if (error instanceof Error && (error as { name?: string }).name === "NoSuchLifecycleConfiguration") {
        console.log("No existing lifecycle configuration found.");
      } else {
        throw error;
      }
    }

    // Set lifecycle configuration
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: lifecycleConfiguration,
    });

    await s3Client.send(command);
    console.log("✅ Lifecycle policies configured successfully!");
    console.log("\nConfigured rules:");
    lifecycleConfiguration.Rules?.forEach((rule) => {
      console.log(`  - ${rule.ID}: ${rule.Status}`);
    });

    console.log("\n📝 Note: Deal-specific document cleanup is handled by Convex scheduled jobs.");
    console.log("   See convex/crons/cleanup.ts for deal document retention policies:");
    console.log("   - Active/Pending deals: 6 months");
    console.log("   - Rejected deals: 3 months");
    console.log("   - Approved/Completed deals: 1 year");
  } catch (error) {
    console.error("❌ Error setting up lifecycle policies:", error);
    process.exit(1);
  }
}

// Run the setup
setupLifecyclePolicies()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
