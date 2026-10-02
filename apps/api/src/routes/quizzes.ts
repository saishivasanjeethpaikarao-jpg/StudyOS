import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  asc,
  desc,
  eq,
  getDb,
  inArray,
  isNull,
  quizAnswers,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  sql,
} from "@open-sunsama/database";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  uuidSchema,
} from "@open-sunsama/utils";
import { jwtAuth, type AuthVariables } from "../middleware/auth.js";
import {
  notifyLearning,
  requireOwnedQuiz,
  validateLearningLinks,
} from "../services/learning.js";
import {
  questionInputSchema,
  scoreQuiz,
  takingPayload,
  validateQuestions,
  type QuestionInput,
  type QuizSnapshotQuestion,
} from "../services/quiz-scoring.js";
import { expectedRevision } from "../validation/study-sessions.js";

const quizzesRouter = new Hono<{ Variables: AuthVariables }>();
const quizAttemptsRouter = new Hono<{ Variables: AuthVariables }>();
quizzesRouter.use("*", jwtAuth);
quizAttemptsRouter.use("*", jwtAuth);
const id = z.object({ id: uuidSchema });
const authoring = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().max(10000).nullable().optional(),
    subjectId: uuidSchema.nullable().optional(),
    assignmentId: uuidSchema.nullable().optional(),
    resourceId: uuidSchema.nullable().optional(),
    status: z.enum(["draft", "published"]).default("draft"),
    questions: z.array(questionInputSchema).max(100).default([]),
  })
  .strict();
const answersSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionId: uuidSchema,
            selectedOptionIds: z.array(uuidSchema).max(12),
          })
          .strict()
      )
      .max(100),
  })
  .strict();

async function quizContent(quizId: string) {
  const db = getDb();
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.position));
  const options = questions.length
    ? await db
        .select()
        .from(quizOptions)
        .where(
          inArray(
            quizOptions.questionId,
            questions.map((q) => q.id)
          )
        )
        .orderBy(asc(quizOptions.position))
    : [];
  return questions.map((question) => ({
    ...question,
    options: options.filter((option) => option.questionId === question.id),
  }));
}

function toSnapshot(
  content: Awaited<ReturnType<typeof quizContent>>
): QuizSnapshotQuestion[] {
  return content.map((q) => ({
    id: q.id,
    type: q.type as "single" | "multiple",
    prompt: q.prompt,
    explanation: q.explanation,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.isCorrect,
    })),
  }));
}

async function insertQuestions(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  quizId: string,
  input: QuestionInput[]
) {
  for (const [position, question] of input.entries()) {
    const [row] = await tx
      .insert(quizQuestions)
      .values({
        quizId,
        position,
        type: question.type,
        prompt: question.prompt,
        explanation: question.explanation ?? null,
        sourceResourceId: question.sourceResourceId ?? null,
        sourceReference: question.sourceReference ?? null,
        provenance: { source: "manual" },
      })
      .returning();
    if (!row) throw new Error("Question creation failed");
    await tx.insert(quizOptions).values(
      question.options.map((option, optionPosition) => ({
        questionId: row.id,
        position: optionPosition,
        text: option.text,
        isCorrect: option.isCorrect,
      }))
    );
  }
}

async function validateAuthoring(
  userId: string,
  input: z.infer<typeof authoring>
) {
  if (input.status === "published" && input.questions.length === 0)
    throw new ValidationError("Add a question before publishing");
  validateQuestions(input.questions);
  const db = getDb();
  await validateLearningLinks(db, userId, {
    subjectId: input.subjectId,
    assignmentId: input.assignmentId,
    resourceId: input.resourceId,
  });
  for (const question of input.questions)
    if (question.sourceResourceId)
      await validateLearningLinks(db, userId, {
        resourceId: question.sourceResourceId,
      });
}

quizzesRouter.get(
  "/",
  zValidator(
    "query",
    z.object({
      subjectId: uuidSchema.optional(),
      assignmentId: uuidSchema.optional(),
      resourceId: uuidSchema.optional(),
    })
  ),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      filter = c.req.valid("query");
    await validateLearningLinks(db, userId, filter);
    const data = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.userId, userId),
          isNull(quizzes.deletedAt),
          filter.subjectId
            ? eq(quizzes.subjectId, filter.subjectId)
            : undefined,
          filter.assignmentId
            ? eq(quizzes.assignmentId, filter.assignmentId)
            : undefined,
          filter.resourceId
            ? eq(quizzes.resourceId, filter.resourceId)
            : undefined
        )
      )
      .orderBy(desc(quizzes.updatedAt))
      .limit(200);
    return c.json({ success: true, data });
  }
);

quizzesRouter.post("/", zValidator("json", authoring), async (c) => {
  const userId = c.get("userId"),
    input = c.req.valid("json"),
    db = getDb();
  await validateAuthoring(userId, input);
  const quiz = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(quizzes)
      .values({
        userId,
        title: input.title,
        description: input.description ?? null,
        subjectId: input.subjectId ?? null,
        assignmentId: input.assignmentId ?? null,
        resourceId: input.resourceId ?? null,
        status: input.status,
      })
      .returning();
    if (!row) throw new Error("Quiz creation failed");
    await insertQuestions(tx, row.id, input.questions);
    return row;
  });
  notifyLearning(userId, "quizzes");
  return c.json(
    { success: true, data: { ...quiz, questions: await quizContent(quiz.id) } },
    201
  );
});

quizzesRouter.get("/:id", zValidator("param", id), async (c) => {
  const quiz = await requireOwnedQuiz(
    getDb(),
    c.get("userId"),
    c.req.valid("param").id
  );
  return c.json({
    success: true,
    data: { ...quiz, questions: await quizContent(quiz.id) },
  });
});

quizzesRouter.put(
  "/:id",
  zValidator("param", id),
  zValidator("json", authoring),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      quizId = c.req.valid("param").id,
      input = c.req.valid("json");
    await requireOwnedQuiz(db, userId, quizId);
    await validateAuthoring(userId, input);
    const revision = expectedRevision(c.req.header("If-Match"));
    const quiz = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(quizzes)
        .set({
          title: input.title,
          description: input.description ?? null,
          subjectId: input.subjectId ?? null,
          assignmentId: input.assignmentId ?? null,
          resourceId: input.resourceId ?? null,
          status: input.status,
          updatedAt: new Date(),
          revision: sql`${quizzes.revision} + 1`,
        })
        .where(
          and(
            eq(quizzes.id, quizId),
            eq(quizzes.userId, userId),
            isNull(quizzes.deletedAt),
            eq(quizzes.revision, revision)
          )
        )
        .returning();
      if (!row) throw new ConflictError("Quiz changed. Refresh and try again.");
      await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
      await insertQuestions(tx, quizId, input.questions);
      return row;
    });
    notifyLearning(userId, "quizzes");
    return c.json({
      success: true,
      data: { ...quiz, questions: await quizContent(quiz.id) },
    });
  }
);

quizzesRouter.delete("/:id", zValidator("param", id), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    quizId = c.req.valid("param").id;
  await requireOwnedQuiz(db, userId, quizId);
  const revision = expectedRevision(c.req.header("If-Match"));
  const [row] = await db
    .update(quizzes)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      revision: sql`${quizzes.revision} + 1`,
    })
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.userId, userId),
        isNull(quizzes.deletedAt),
        eq(quizzes.revision, revision)
      )
    )
    .returning();
  if (!row) throw new ConflictError("Quiz changed. Refresh and try again.");
  notifyLearning(userId, "quizzes");
  return c.json({ success: true, data: row });
});

quizzesRouter.get("/:id/play", zValidator("param", id), async (c) => {
  const quiz = await requireOwnedQuiz(
    getDb(),
    c.get("userId"),
    c.req.valid("param").id
  );
  if (quiz.status !== "published")
    throw new ConflictError("Publish this quiz before taking it");
  return c.json({
    success: true,
    data: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: takingPayload(toSnapshot(await quizContent(quiz.id))),
    },
  });
});

quizzesRouter.post("/:id/attempts", zValidator("param", id), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    quizId = c.req.valid("param").id;
  const started = await db.transaction(async (tx) => {
    // A shared row lock prevents an authoring replacement from interleaving
    // with the private attempt snapshot.
    const [quiz] = await tx
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.userId, userId),
          isNull(quizzes.deletedAt)
        )
      )
      .limit(1)
      .for("share");
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.status !== "published")
      throw new ConflictError("Publish this quiz before taking it");
    const questions = await tx
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizQuestions.position));
    const options = questions.length
      ? await tx
          .select()
          .from(quizOptions)
          .where(
            inArray(
              quizOptions.questionId,
              questions.map((question) => question.id)
            )
          )
          .orderBy(asc(quizOptions.position))
      : [];
    const snapshot = toSnapshot(
      questions.map((question) => ({
        ...question,
        options: options.filter((option) => option.questionId === question.id),
      }))
    );
    if (!snapshot.length) throw new ConflictError("This quiz has no questions");
    const [row] = await tx
      .insert(quizAttempts)
      .values({
        userId,
        quizId: quiz.id,
        snapshot,
        totalQuestions: snapshot.length,
      })
      .returning();
    if (!row) throw new Error("Quiz attempt creation failed");
    return { row, snapshot };
  });
  notifyLearning(userId, "attempts");
  return c.json(
    {
      success: true,
      data: {
        id: started.row.id,
        quizId,
        status: started.row.status,
        startedAt: started.row.startedAt,
        questions: takingPayload(started.snapshot),
      },
    },
    201
  );
});

quizzesRouter.get("/:id/attempts", zValidator("param", id), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    quizId = c.req.valid("param").id;
  await requireOwnedQuiz(db, userId, quizId);
  const data = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      status: quizAttempts.status,
      startedAt: quizAttempts.startedAt,
      submittedAt: quizAttempts.submittedAt,
      correctCount: quizAttempts.correctCount,
      totalQuestions: quizAttempts.totalQuestions,
      scorePercent: quizAttempts.scorePercent,
    })
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.startedAt))
    .limit(100);
  return c.json({ success: true, data });
});

async function ownedAttempt(userId: string, attemptId: string) {
  const [row] = await getDb()
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)))
    .limit(1);
  if (!row) throw new NotFoundError("Quiz attempt");
  return row;
}

async function attemptResponse(userId: string, attemptId: string) {
  const row = await ownedAttempt(userId, attemptId);
  const snapshot = row.snapshot as QuizSnapshotQuestion[];
  if (row.status === "started")
    return {
      id: row.id,
      quizId: row.quizId,
      status: row.status,
      startedAt: row.startedAt,
      questions: takingPayload(snapshot),
    };
  const answers = await getDb()
    .select()
    .from(quizAnswers)
    .where(eq(quizAnswers.attemptId, row.id));
  return {
    id: row.id,
    quizId: row.quizId,
    status: row.status,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    correctCount: row.correctCount,
    totalQuestions: row.totalQuestions,
    incorrectCount: row.totalQuestions - (row.correctCount ?? 0),
    scorePercent: row.scorePercent,
    questions: snapshot,
    answers,
  };
}

quizAttemptsRouter.get("/:id", zValidator("param", id), async (c) =>
  c.json({
    success: true,
    data: await attemptResponse(c.get("userId"), c.req.valid("param").id),
  })
);

quizAttemptsRouter.post(
  "/:id/submit",
  zValidator("param", id),
  zValidator("json", answersSchema),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      attemptId = c.req.valid("param").id,
      input = c.req.valid("json");
    const row = await ownedAttempt(userId, attemptId);
    if (row.status === "submitted") {
      const prior = await db
        .select()
        .from(quizAnswers)
        .where(eq(quizAnswers.attemptId, attemptId));
      const same =
        prior.length === row.totalQuestions &&
        prior.every((answer) => {
          const submitted = input.answers.find(
            (item) => item.questionId === answer.questionId
          );
          const selected = submitted?.selectedOptionIds ?? [];
          return (
            selected.length === answer.selectedOptionIds.length &&
            selected.every((id) => answer.selectedOptionIds.includes(id))
          );
        });
      if (!same)
        throw new ConflictError("This quiz attempt was already submitted");
      return c.json({
        success: true,
        data: await attemptResponse(userId, attemptId),
      });
    }
    const snapshot = row.snapshot as QuizSnapshotQuestion[];
    const score = scoreQuiz(snapshot, input.answers);
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(quizAttempts)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          correctCount: score.correctCount,
          scorePercent: score.scorePercent,
        })
        .where(
          and(
            eq(quizAttempts.id, attemptId),
            eq(quizAttempts.userId, userId),
            eq(quizAttempts.status, "started")
          )
        )
        .returning();
      if (!updated)
        throw new ConflictError("This quiz attempt was already submitted");
      await tx
        .insert(quizAnswers)
        .values(score.results.map((answer) => ({ attemptId, ...answer })));
    });
    notifyLearning(userId, "attempts");
    return c.json({
      success: true,
      data: await attemptResponse(userId, attemptId),
    });
  }
);

export { quizzesRouter, quizAttemptsRouter };
