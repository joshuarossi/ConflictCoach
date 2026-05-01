import { cleanupAbandonedCases } from "./crons.cleanup";

const crons = {
  cleanupAbandonedCases: {
    schedule: "daily",
    handler: cleanupAbandonedCases,
  },
};

export default crons;
