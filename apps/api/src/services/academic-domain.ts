import {
  and,
  assignments,
  eq,
  isNull,
  subjects,
  type DbClient,
} from "@open-sunsama/database";
import { NotFoundError } from "@open-sunsama/utils";

/**
 * Resolve a subject through both its ID and authenticated owner. Returning a
 * 404 for foreign IDs avoids revealing that another student's record exists.
 */
export async function requireOwnedSubject(
  db: DbClient,
  userId: string,
  subjectId: string
) {
  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .limit(1);

  if (!subject) throw new NotFoundError("Subject", subjectId);
  return subject;
}

/** Resolve a non-deleted assignment through its ID and authenticated owner. */
export async function requireOwnedAssignment(
  db: DbClient,
  userId: string,
  assignmentId: string
) {
  const [assignment] = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .limit(1);

  if (!assignment) throw new NotFoundError("Assignment", assignmentId);
  return assignment;
}
