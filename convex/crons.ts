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

// Clean up deal documents daily at 2 AM UTC
// Retention: 6mo (active/pending), 3mo (rejected), 1yr (approved)
crons.daily(
  "cleanup-deal-documents",
  {
    hourUTC: 2,
    minuteUTC: 0,
  },
  internal.lib.cleanup.cleanupDealDocuments
);

// Clean up old notifications daily at 3 AM UTC
// Retention: 90 days or expiresAt timestamp
crons.daily(
  "cleanup-notifications",
  {
    hourUTC: 3,
    minuteUTC: 0,
  },
  internal.lib.cleanup.cleanupNotifications
);

// Clean up old security logs weekly (Sunday at 4 AM UTC)
// Retention: 90 days
crons.weekly(
  "cleanup-security-logs",
  {
    dayOfWeek: "sunday",
    hourUTC: 4,
    minuteUTC: 0,
  },
  internal.lib.cleanup.cleanupSecurityLogs
);

// Clean up expired rate limit entries hourly
crons.hourly(
  "cleanup-rate-limits",
  {
    minuteUTC: 0,
  },
  internal.lib.cleanup.cleanupRateLimits
);

export default crons;