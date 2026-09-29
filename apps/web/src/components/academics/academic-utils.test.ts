import { describe, expect, it } from "vitest";
import type { Assignment } from "@open-sunsama/types";
import {
  assignmentDraft,
  createAssignmentInput,
  createSubjectInput,
  filterAssignments,
  formatAssignmentDue,
  mergeSubjects,
} from "./academic-utils";

const now = new Date("2026-09-29T12:00:00.000Z");

function assignment(
  id: string,
  dueAt: string,
  status: Assignment["status"] = "not_started"
): Assignment {
  return {
    id,
    userId: "user-1",
    subjectId: "subject-1",
    title: id,
    description: null,
    dueAt: new Date(dueAt),
    status,
    priority: "P2",
    estimatedMinutes: null,
    completedMinutes: 0,
    revision: 1,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("academic UI helpers", () => {
  const items = [
    assignment("overdue", "2026-09-28T12:00:00.000Z"),
    assignment("upcoming", "2026-10-01T12:00:00.000Z"),
    assignment("progress", "2026-10-02T12:00:00.000Z", "in_progress"),
    assignment("done", "2026-09-27T12:00:00.000Z", "completed"),
    assignment("cancelled", "2026-09-27T12:00:00.000Z", "cancelled"),
  ];

  it("separates upcoming, overdue, in-progress, and completed views", () => {
    expect(
      filterAssignments(items, "upcoming", now).map((item) => item.id)
    ).toEqual(["upcoming", "progress"]);
    expect(
      filterAssignments(items, "overdue", now).map((item) => item.id)
    ).toEqual(["overdue"]);
    expect(
      filterAssignments(items, "in_progress", now).map((item) => item.id)
    ).toEqual(["progress"]);
    expect(
      filterAssignments(items, "completed", now).map((item) => item.id)
    ).toEqual(["done"]);
    expect(filterAssignments(items, "all", now)).toHaveLength(5);
  });

  it("normalizes optional subject and form whitespace for API input", () => {
    expect(
      createAssignmentInput({
        ...assignmentDraft(),
        title: "  Essay  ",
        description: "   ",
        subjectId: "",
        dueAt: "2026-10-01T09:30",
        estimatedMinutes: "90",
      })
    ).toMatchObject({
      title: "Essay",
      description: null,
      subjectId: null,
      estimatedMinutes: 90,
    });

    expect(
      createSubjectInput({
        name: "  Physics ",
        description: "  Mechanics  ",
        color: "#2563eb",
        icon: "flask-conical",
      })
    ).toEqual({
      name: "Physics",
      description: "Mechanics",
      color: "#2563eb",
      icon: "flask-conical",
    });
  });

  it("formats a due date as a student-friendly label", () => {
    expect(formatAssignmentDue("2026-09-29T15:30:00.000Z", now)).toContain(
      "at"
    );
  });

  it("deduplicates a Subject while archive queries refresh", () => {
    const subject = {
      id: "subject-1",
      userId: "user-1",
      name: "Mathematics",
      description: null,
      icon: null,
      color: null,
      sortOrder: 0,
      archivedAt: null,
      revision: 2,
      createdAt: now,
      updatedAt: now,
    };

    expect(mergeSubjects([subject], [{ ...subject, archivedAt: now }])).toEqual(
      [subject]
    );
  });
});
