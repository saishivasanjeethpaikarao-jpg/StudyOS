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

/** API schedules are ISO instants with explicit offsets and an IANA timezone. */
export interface StudySessionScheduleInput {
  startAt: string;
  endAt: string;
  timezone: string;
  plannedMinutes: number;
}

export interface CreateStudySessionInput extends StudySessionScheduleInput {
  assignmentId: string;
}

export type UpdateStudySessionInput = Partial<StudySessionScheduleInput>;
export type RescheduleStudySessionInput = StudySessionScheduleInput;
export interface CompleteStudySessionInput {
  actualMinutes?: number;
}

export interface StudySessionFilterInput {
  assignmentId?: string;
  status?: StudySessionStatus;
  /** Inclusive UTC instant. */
  from?: string;
  /** Exclusive UTC instant. */
  to?: string;
  page?: number;
  limit?: number;
}

export interface AssignmentStudyProgress {
  assignmentId: string;
  estimatedMinutes: number | null;
  unattributedCompletedMinutes: number;
  completedSessionMinutes: number;
  studiedMinutes: number;
  activePlannedMinutes: number;
  /** Null when the Assignment has no estimate; otherwise at least zero. */
  remainingMinutes: number | null;
}
