/** Canonical scheduled academic work toward exactly one assignment. */
export type StudySessionStatus =
  "planned" | "completed" | "skipped" | "cancelled";

export interface StudySession {
  id: string;
  userId: string;
  assignmentId: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  plannedMinutes: number;
  status: StudySessionStatus;
  actualMinutes: number | null;
  completedAt: Date | null;
  planApplicationId: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Idempotency record for a future confirmed plan. */
export interface StudyPlanApplication {
  id: string;
  userId: string;
  assignmentId: string;
  clientMutationId: string;
  requestHash: string;
  createdAt: Date;
}
