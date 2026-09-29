import { addDays, format } from "date-fns";
import type {
  Assignment,
  AssignmentStatus,
  CreateAssignmentInput,
  CreateSubjectInput,
  Subject,
  TaskPriority,
  UpdateAssignmentInput,
} from "@open-sunsama/types";

export type AssignmentView =
  "upcoming" | "overdue" | "in_progress" | "completed" | "all";

export interface AssignmentDraft {
  title: string;
  description: string;
  subjectId: string;
  dueAt: string;
  priority: TaskPriority;
  estimatedMinutes: string;
  status: AssignmentStatus;
}

export interface SubjectDraft {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const subjectColors = [
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#ca8a04",
  "#ea580c",
  "#db2777",
  "#7c3aed",
] as const;

export const subjectIcons = [
  { value: "book-open", label: "Book" },
  { value: "calculator", label: "Math" },
  { value: "flask-conical", label: "Science" },
  { value: "languages", label: "Languages" },
  { value: "palette", label: "Creative" },
] as const;

export function createSubjectInput(draft: SubjectDraft): CreateSubjectInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    color: draft.color || null,
    icon: draft.icon || null,
  };
}

export function createAssignmentInput(
  draft: AssignmentDraft
): CreateAssignmentInput {
  const estimate = draft.estimatedMinutes.trim();
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    subjectId: draft.subjectId || null,
    dueAt: new Date(draft.dueAt).toISOString(),
    priority: draft.priority,
    estimatedMinutes: estimate ? Number(estimate) : null,
  };
}

export function updateAssignmentInput(
  draft: AssignmentDraft
): UpdateAssignmentInput {
  return { ...createAssignmentInput(draft), status: draft.status };
}

export function assignmentDraft(assignment?: Assignment): AssignmentDraft {
  const due = assignment
    ? new Date(assignment.dueAt)
    : new Date(Date.now() + 86400000);
  const localDue = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return {
    title: assignment?.title ?? "",
    description: assignment?.description ?? "",
    subjectId: assignment?.subjectId ?? "",
    dueAt: localDue,
    priority: assignment?.priority ?? "P2",
    estimatedMinutes: assignment?.estimatedMinutes?.toString() ?? "",
    status: assignment?.status ?? "not_started",
  };
}

export function subjectDraft(subject?: Subject): SubjectDraft {
  return {
    name: subject?.name ?? "",
    description: subject?.description ?? "",
    color: subject?.color ?? subjectColors[0],
    icon: subject?.icon ?? "book-open",
  };
}

export function mergeSubjects(
  activeSubjects: Subject[] = [],
  archivedSubjects: Subject[] = []
): Subject[] {
  const byId = new Map<string, Subject>();
  for (const subject of archivedSubjects) byId.set(subject.id, subject);
  // Prefer the active query while archive/restore invalidations are settling.
  for (const subject of activeSubjects) byId.set(subject.id, subject);
  return [...byId.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );
}

export function filterAssignments(
  assignments: Assignment[],
  view: AssignmentView,
  now = new Date()
): Assignment[] {
  return assignments
    .filter((assignment) => {
      const due = new Date(assignment.dueAt);
      switch (view) {
        case "upcoming":
          return (
            due >= now &&
            assignment.status !== "completed" &&
            assignment.status !== "cancelled"
          );
        case "overdue":
          return (
            due < now &&
            assignment.status !== "completed" &&
            assignment.status !== "cancelled"
          );
        case "in_progress":
          return assignment.status === "in_progress";
        case "completed":
          return assignment.status === "completed";
        default:
          return true;
      }
    })
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
}

export function assignmentStatusLabel(status: AssignmentStatus): string {
  return {
    not_started: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  }[status];
}

export function priorityLabel(priority: TaskPriority): string {
  return { P0: "Urgent", P1: "High", P2: "Medium", P3: "Low" }[priority];
}

export function formatAssignmentDue(
  dueAt: Date | string,
  now = new Date()
): string {
  const due = new Date(dueAt);
  const dueDay = format(due, "yyyy-MM-dd");
  const day =
    dueDay === format(now, "yyyy-MM-dd")
      ? "Today"
      : dueDay === format(addDays(now, 1), "yyyy-MM-dd")
        ? "Tomorrow"
        : format(due, "EEE, MMM d");
  return `${day} at ${format(due, "p")}`;
}

export function getAcademicErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
