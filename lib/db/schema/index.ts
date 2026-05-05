/**
 * Re-exports every schema in `lib/db/schema/` so Drizzle can build relations
 * and `db` can serve typed queries. Add new domains here.
 */
export * from "./enums";
export * from "./_helpers";

export * from "./users";
export * from "./parents";
export * from "./students";
export * from "./tutors";
export * from "./leads";
export * from "./sessions";

export * from "./agentRuns";
export * from "./approvalRequests";
export * from "./auditLog";
export * from "./automationPreferences";
export * from "./consents";

export * from "./driveFiles";
export * from "./emailThreads";
export * from "./googleTokens";

export * from "./orgProfile";
export * from "./agentSettings";
export * from "./agentKnowledge";

export * from "./assessments";
export * from "./homework";
export * from "./learningPlans";

export * from "./invoices";

export * from "./callRecords";
