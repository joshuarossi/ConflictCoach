import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup abandoned cases",
  { hours: 24 },
  internal.crons.cleanup.cleanupAbandonedCasesCron,
  {},
);

export default crons;
