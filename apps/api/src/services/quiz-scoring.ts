import { z } from "zod";
import { ValidationError } from "@open-sunsama/utils";

export const questionInputSchema = z
  .object({
    type: z.enum(["single", "multiple"]),
    prompt: z.string().trim().min(1).max(5000),
    explanation: z.string().max(10000).nullable().optional(),
    options: z
      .array(
        z
          .object({
            text: z.string().trim().min(1).max(1000),
            isCorrect: z.boolean(),
          })
          .strict()
      )
      .min(2)
      .max(12),
    sourceResourceId: z.string().uuid().nullable().optional(),
    sourceReference: z.string().max(1000).nullable().optional(),
  })
  .strict();

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuizSnapshotQuestion = {
  id: string;
  type: "single" | "multiple";
  prompt: string;
  explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
};

export function validateQuestions(questions: QuestionInput[]) {
  for (const question of questions) {
    const correct = question.options.filter((o) => o.isCorrect).length;
    if (question.type === "single" && correct !== 1)
      throw new ValidationError(
        "Single-answer questions need exactly one correct option"
      );
    if (question.type === "multiple" && correct < 1)
      throw new ValidationError(
        "Multiple-answer questions need at least one correct option"
      );
    const labels = question.options.map((o) =>
      o.text.trim().toLocaleLowerCase()
    );
    if (new Set(labels).size !== labels.length)
      throw new ValidationError("Question options must be distinct");
  }
}

export type SubmittedAnswer = {
  questionId: string;
  selectedOptionIds: string[];
};

/** Exact-set grading. No AI and no partial credit in Phase 3. */
export function scoreQuiz(
  snapshot: QuizSnapshotQuestion[],
  answers: SubmittedAnswer[]
) {
  const answerMap = new Map<string, string[]>();
  for (const answer of answers) {
    if (
      answerMap.has(answer.questionId) ||
      !snapshot.some((q) => q.id === answer.questionId)
    ) {
      throw new ValidationError("Invalid or duplicate question answer");
    }
    if (
      new Set(answer.selectedOptionIds).size !== answer.selectedOptionIds.length
    )
      throw new ValidationError("Choose each option only once");
    answerMap.set(answer.questionId, answer.selectedOptionIds);
  }
  const results = snapshot.map((question) => {
    const selected = answerMap.get(question.id) ?? [];
    if (question.type === "single" && selected.length > 1)
      throw new ValidationError(
        "Choose one answer for a single-answer question"
      );
    if (
      selected.some(
        (id) => !question.options.some((option) => option.id === id)
      )
    )
      throw new ValidationError("Invalid answer option");
    const correct = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);
    const isCorrect =
      selected.length === correct.length &&
      selected.every((id) => correct.includes(id));
    return { questionId: question.id, selectedOptionIds: selected, isCorrect };
  });
  const correctCount = results.filter((result) => result.isCorrect).length;
  return {
    results,
    correctCount,
    totalQuestions: snapshot.length,
    incorrectCount: snapshot.length - correctCount,
    scorePercent: snapshot.length
      ? Math.round((correctCount / snapshot.length) * 100)
      : 0,
  };
}

export function takingPayload(snapshot: QuizSnapshotQuestion[]) {
  return snapshot.map(({ id, type, prompt, options }) => ({
    id,
    type,
    prompt,
    options: options.map(({ id: optionId, text }) => ({ id: optionId, text })),
  }));
}
