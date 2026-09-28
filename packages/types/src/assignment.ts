import type { TaskPriority } from "./task.js";

export type AssignmentStatus =
  "not_started" | "in_progress" | "completed" | "cancelled";

/** A first-class academic deadline owned by a StudyOS user. */
export interface Assignment {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  dueAt: Date;
  status: AssignmentStatus;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  completedMinutes: number;
  revision: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssignmentInput {
  subjectId?: string | null;
  title: string;
  description?: string | null;
  /** ISO 8601 timestamp with an explicit timezone offset. */
  dueAt: string;
  status?: AssignmentStatus;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
  completedMinutes?: number;
}

export interface UpdateAssignmentInput {
  subjectId?: string | null;
  title?: string;
  description?: string | null;
  /** ISO 8601 timestamp with an explicit timezone offset. */
  dueAt?: string;
  status?: AssignmentStatus;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
  completedMinutes?: number;
}

export interface AssignmentFilterInput {
  subjectId?: string;
  status?: AssignmentStatus;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  limit?: number;
}
