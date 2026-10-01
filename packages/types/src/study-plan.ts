import type { StudySession } from "./study-session.js";

/** Student choices. Omitted dates default to today through the day before due. */
export interface StudyPlanInput {
  targetMinutes?: number;
  startDate?: string;
  endDate?: string;
  preferredSessionMinutes: number;
  timezone: string;
}

export interface NormalizedStudyPlanInput {
  targetMinutes: number;
  startDate: string;
  endDate: string;
  preferredSessionMinutes: number;
  timezone: string;
  workStartHour: number;
  workEndHour: number;
}

export interface StudyPlanSlot {
  localDate: string;
  startAt: string;
  endAt: string;
  timezone: string;
  plannedMinutes: number;
}

export interface StudyPlanPreview {
  assignmentId: string;
  assignmentRevision: number;
  availabilityFingerprint: string;
  normalizedInput: NormalizedStudyPlanInput;
  proposedSlots: StudyPlanSlot[];
  completedMinutes: number;
  alreadyPlannedMinutes: number;
  remainingToPlanMinutes: number;
  plannedMinutes: number;
  unscheduledMinutes: number;
  confirmable: boolean;
}

/** An exact copy of the preview context plus a persistent retry key. */
export interface ConfirmStudyPlanInput {
  clientMutationId: string;
  assignmentRevision: number;
  availabilityFingerprint: string;
  normalizedInput: NormalizedStudyPlanInput;
  proposedSlots: StudyPlanSlot[];
}

export interface ConfirmStudyPlanResult {
  planApplicationId: string;
  sessions: StudySession[];
  replayed: boolean;
}
