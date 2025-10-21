import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up signature data every hour
crons.interval(
  "cleanup-signature-data",
  { hours: 1 }, // Run every hour
  internal.signatures.cleanupSignatureData
);

export default crons;