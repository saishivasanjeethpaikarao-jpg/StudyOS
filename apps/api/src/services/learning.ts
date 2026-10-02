import {
  and,
  eq,
  isNull,
  assignments,
  subjects,
  studySessions,
  resources,
  quizzes,
  type DbClient,
} from "@open-sunsama/database";
import { NotFoundError, ValidationError } from "@open-sunsama/utils";
import { publishEvent } from "../lib/websocket/index.js";

export type LearningKind =
  "resources" | "notes" | "reminders" | "focus" | "quizzes" | "attempts";
/** Emit only after the owning route has committed its database mutation. */
export function notifyLearning(userId: string, kind: LearningKind) {
  void publishEvent(userId, "learning:changed", { kind });
}

export type LearningLinks = {
  subjectId?: string | null;
  assignmentId?: string | null;
  studySessionId?: string | null;
  resourceId?: string | null;
  quizId?: string | null;
};

/** Validate every supplied relation through the authenticated owner. */
export async function validateLearningLinks(
  db: DbClient,
  userId: string,
  links: LearningLinks
) {
  if (links.subjectId) {
    const [row] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, links.subjectId), eq(subjects.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundError("Subject", links.subjectId);
  }
  if (links.assignmentId) {
    const [row] = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.id, links.assignmentId),
          eq(assignments.userId, userId),
          isNull(assignments.deletedAt)
        )
      )
      .limit(1);
    if (!row) throw new NotFoundError("Assignment", links.assignmentId);
  }
  if (links.studySessionId) {
    const [row] = await db
      .select({ id: studySessions.id })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.id, links.studySessionId),
          eq(studySessions.userId, userId),
          isNull(studySessions.deletedAt)
        )
      )
      .limit(1);
    if (!row) throw new NotFoundError("Study Session", links.studySessionId);
  }
  if (links.resourceId)
    await requireOwnedResource(db, userId, links.resourceId);
  if (links.quizId) await requireOwnedQuiz(db, userId, links.quizId);
}

export async function requireOwnedResource(
  db: DbClient,
  userId: string,
  id: string
) {
  const [row] = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.id, id),
        eq(resources.userId, userId),
        isNull(resources.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError("Resource", id);
  return row;
}

export async function requireOwnedQuiz(
  db: DbClient,
  userId: string,
  id: string
) {
  const [row] = await db
    .select()
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, id),
        eq(quizzes.userId, userId),
        isNull(quizzes.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError("Quiz", id);
  return row;
}

/** Never fetch the URL server-side: avoid SSRF and credentialed metadata calls. */
export function normalizeResourceUrl(raw: string, type: "youtube" | "web") {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ValidationError("Enter a valid URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ValidationError("Use a public HTTPS link without credentials");
  }
  if (type === "web") return { url: url.toString(), providerItemId: null };
  const host = url.hostname.toLowerCase();
  let videoId: string | null = null;
  if (host === "youtu.be" || host === "www.youtu.be")
    videoId = url.pathname.slice(1);
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
    ].includes(host)
  ) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else if (/^\/(shorts|live|embed)\//.test(url.pathname))
      videoId = url.pathname.split("/")[2] ?? null;
  }
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new ValidationError("Enter a supported YouTube video link");
  }
  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    providerItemId: videoId,
  };
}
