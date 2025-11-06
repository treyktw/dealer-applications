import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old webhook events every week (Sunday at 3 AM)
crons.weekly(
  "cleanup-old-webhook-events",
  {
    dayOfWeek: "sunday",
    hourUTC: 3,
    minuteUTC: 0,
  },
  internal.webhooks.cleanupOldEvents,
  { daysToKeep: 90 }
);

export default crons;