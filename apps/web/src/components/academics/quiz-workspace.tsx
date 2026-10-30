import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import type {
  LearningTarget,
  QuizAttemptResult,
  QuizAttemptStarted,
  QuizInput,
  QuizQuestionInput,
  QuizSummary,
} from "@open-sunsama/types";
import { Button, Input, Label } from "@/components/ui";
import { getApi } from "@/lib/api";
import { learningKeys } from "@/lib/query-keys";
import { toast } from "@/hooks/use-toast";
import { useAccountSync } from "@/hooks/useAccountSync";

const blank = (target: LearningTarget): QuizInput => ({
  title: "",
  description: "",
  subjectId: target.subjectId ?? null,
  assignmentId: target.assignmentId ?? null,
  status: "draft",
  questions: [],
});
const newQuestion = (): QuizQuestionInput => ({
  type: "single",
  prompt: "",
  explanation: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
});

export function QuizWorkspace({ target }: { target: LearningTarget }) {
  const api = getApi().quizzes;
  const { queueMutation } = useAccountSync();
  const client = useQueryClient();
  const filter = {
    subjectId: target.subjectId ?? undefined,
    assignmentId: target.assignmentId ?? undefined,
  };
  const list = useQuery({
    queryKey: [...learningKeys.quizzes, filter],
    queryFn: () => api.list(filter),
  });
  const resources = useQuery({
    queryKey: [...learningKeys.resources, target],
    queryFn: () => getApi().resources.list(target),
  });
  const [mode, setMode] = React.useState<"list" | "edit" | "play" | "result">(
    "list"
  );
  const [editing, setEditing] = React.useState<QuizSummary | null>(null);
  const [form, setForm] = React.useState<QuizInput>(() => blank(target));
  const [attempt, setAttempt] = React.useState<QuizAttemptStarted | null>(null);
  const [result, setResult] = React.useState<QuizAttemptResult | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string[]>>({});
  const [index, setIndex] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [historyQuizId, setHistoryQuizId] = React.useState<string | null>(null);
  const history = useQuery({
    queryKey: [...learningKeys.attempts, historyQuizId],
    queryFn: () => api.attempts(historyQuizId!),
    enabled: !!historyQuizId,
  });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Knowledge Check could not be saved",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: learningKeys.quizzes });
    await client.invalidateQueries({ queryKey: learningKeys.attempts });
  };
  const openEdit = (quiz: QuizSummary) =>
    void run(async () => {
      const author = await api.get(quiz.id);
      setEditing(quiz);
      setForm({
        title: author.title,
        description: author.description,
        subjectId: author.subjectId,
        assignmentId: author.assignmentId,
        resourceId: author.resourceId,
        status: author.status,
        questions: author.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          explanation: q.explanation,
          options: q.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
          sourceResourceId: q.sourceResourceId,
          sourceReference: q.sourceReference,
        })),
      });
      setMode("edit");
    });
  const save = (status: QuizInput["status"]) => {
    void run(async () => {
      const input = { ...form, status };
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueMutation({
          clientMutationId: crypto.randomUUID(),
          entityType: "quiz",
          operation: editing ? "update" : "create",
          entityId: editing?.id ?? crypto.randomUUID(),
          ...(editing ? { expectedRevision: editing.revision } : {}),
          payload: input,
        });
        setMode("list");
        setEditing(null);
        setForm(blank(target));
        return;
      }
      if (editing) await api.update(editing.id, input, editing.revision);
      else await api.create(input);
      await refresh();
      setMode("list");
      setEditing(null);
      setForm(blank(target));
    });
  };
  const begin = (quiz: QuizSummary) =>
    void run(async () => {
      const started = await api.start(quiz.id);
      setAttempt(started);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setMode("play");
      setHistoryQuizId(quiz.id);
      await refresh();
    });
  const review = (attemptId: string) =>
    void run(async () => {
      const item = await api.attempt(attemptId);
      if (item.status === "submitted") {
        setResult(item as QuizAttemptResult);
        setMode("result");
      } else {
        setAttempt(item as QuizAttemptStarted);
        setAnswers({});
        setIndex(0);
        setMode("play");
      }
    });
  const submit = () => {
    if (
      !attempt ||
      !window.confirm(
        "Submit this Knowledge Check? You can review answers afterward."
      )
    )
      return;
    void run(async () => {
      const data = await api.submit(
        attempt.id,
        attempt.questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: answers[q.id] ?? [],
        }))
      );
      setResult(data);
      setMode("result");
      await refresh();
    });
  };
  const choose = (questionId: string, optionId: string, multiple: boolean) => {
    setAnswers((previous) => {
      const chosen = previous[questionId] ?? [];
      return {
        ...previous,
        [questionId]: multiple
          ? chosen.includes(optionId)
            ? chosen.filter((id) => id !== optionId)
            : [...chosen, optionId]
          : [optionId],
      };
    });
  };

  if (mode === "edit")
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save("draft");
        }}
        className="space-y-4 pt-4"
      >
        <Button type="button" variant="ghost" onClick={() => setMode("list")}>
          <ArrowLeft aria-hidden="true" /> Back to quizzes
        </Button>
        <h3 className="text-lg font-semibold">
          {editing ? "Edit Knowledge Check" : "New Knowledge Check"}
        </h3>
        <Label htmlFor="quiz-title">Title</Label>
        <Input
          id="quiz-title"
          className="h-11"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={300}
          required
        />
        <Label htmlFor="quiz-description">Description (optional)</Label>
        <textarea
          id="quiz-description"
          className="w-full rounded-md border bg-background p-2 text-sm"
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Label htmlFor="quiz-resource">Based on a resource (optional)</Label>
        <select
          id="quiz-resource"
          value={form.resourceId ?? ""}
          onChange={(event) =>
            setForm({ ...form, resourceId: event.target.value || null })
          }
          className="h-11 w-full rounded-md border bg-background px-2 text-sm"
        >
          <option value="">No specific resource</option>
          {(resources.data ?? []).map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.title}
            </option>
          ))}
        </select>
        {form.questions.map((question, questionIndex) => (
          <QuestionEditor
            key={questionIndex}
            question={question}
            index={questionIndex}
            count={form.questions.length}
            onChange={(next) =>
              setForm({
                ...form,
                questions: form.questions.map((value, i) =>
                  i === questionIndex ? next : value
                ),
              })
            }
            onRemove={() =>
              setForm({
                ...form,
                questions: form.questions.filter((_, i) => i !== questionIndex),
              })
            }
            onMove={(direction) => {
              const next = [...form.questions],
                other = questionIndex + direction;
              if (other < 0 || other >= next.length) return;
              [next[questionIndex], next[other]] = [
                next[other]!,
                next[questionIndex]!,
              ];
              setForm({ ...form, questions: next });
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setForm({ ...form, questions: [...form.questions, newQuestion()] })
          }
        >
          <Plus aria-hidden="true" /> Add question
        </Button>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="submit" disabled={busy}>
            Save draft
          </Button>
          <Button
            type="button"
            disabled={
              busy ||
              !form.questions.length ||
              !form.title.trim() ||
              form.questions.some(
                (question) =>
                  !question.prompt.trim() ||
                  question.options.some((option) => !option.text.trim())
              )
            }
            onClick={() => save("published")}
          >
            Publish quiz
          </Button>
        </div>
      </form>
    );

  if (mode === "play" && attempt) {
    const question = attempt.questions[index];
    if (!question) return null;
    return (
      <div className="space-y-5 pt-4">
        <Button variant="ghost" onClick={() => setMode("list")}>
          <ArrowLeft aria-hidden="true" /> Back to quizzes
        </Button>
        <p className="text-sm text-muted-foreground">
          Question {index + 1} of {attempt.questions.length}
        </p>
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">{question.prompt}</legend>
          <p className="text-sm text-muted-foreground">
            {question.type === "multiple"
              ? "Select all that apply"
              : "Choose one answer"}
          </p>
          {question.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/40"
            >
              <input
                type={question.type === "multiple" ? "checkbox" : "radio"}
                name={`question-${question.id}`}
                checked={(answers[question.id] ?? []).includes(option.id)}
                onChange={() =>
                  choose(question.id, option.id, question.type === "multiple")
                }
                className="h-5 w-5"
              />
              {option.text}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-between gap-2 border-t pt-4">
          <Button
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft aria-hidden="true" /> Previous
          </Button>
          {index < attempt.questions.length - 1 ? (
            <Button onClick={() => setIndex(index + 1)}>
              Next <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button disabled={busy} onClick={submit}>
              Submit quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "result" && result)
    return (
      <div className="space-y-5 pt-4">
        <Button variant="ghost" onClick={() => setMode("list")}>
          <ArrowLeft aria-hidden="true" /> Back to quizzes
        </Button>
        <div className="rounded-xl border p-5">
          <h3 className="text-lg font-semibold">
            Your score: {result.scorePercent}%
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.correctCount} correct out of {result.totalQuestions} ·{" "}
            {result.incorrectCount} to review
          </p>
        </div>
        {result.questions.map((question, i) => {
          const answer = result.answers.find(
            (item) => item.questionId === question.id
          );
          return (
            <section key={question.id} className="rounded-xl border p-4">
              <h4 className="font-medium">
                {i + 1}. {question.prompt}
              </h4>
              <p className="mt-1 text-sm font-medium">
                {answer?.isCorrect ? "Correct" : "Review this one"}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {question.options.map((option) => (
                  <li key={option.id}>
                    {answer?.selectedOptionIds.includes(option.id)
                      ? "Your choice: "
                      : ""}
                    {option.text}
                    {option.isCorrect ? " — correct answer" : ""}
                  </li>
                ))}
              </ul>
              {question.explanation && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {question.explanation}
                </p>
              )}
            </section>
          );
        })}
        <Button
          onClick={() => {
            const quiz = list.data?.find((item) => item.id === result.quizId);
            if (quiz) begin(quiz);
          }}
        >
          Try again
        </Button>
      </div>
    );

  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Check what you remember. Answers are scored by StudyOS, not AI.
      </p>
      <Button
        onClick={() => {
          setEditing(null);
          setForm(blank(target));
          setMode("edit");
        }}
      >
        <Plus aria-hidden="true" /> New Knowledge Check
      </Button>
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading quizzes…</p>
      ) : list.isError ? (
        <p role="alert">
          Quizzes could not be loaded.{" "}
          <Button variant="link" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </p>
      ) : !list.data?.length ? (
        <p className="text-sm text-muted-foreground">
          No quizzes yet. Add a few questions to test what you learned.
        </p>
      ) : (
        list.data.map((quiz) => (
          <article key={quiz.id} className="rounded-xl border p-4">
            <h3 className="font-medium">{quiz.title}</h3>
            <p className="text-xs text-muted-foreground">
              {quiz.status === "published" ? "Ready to take" : "Draft"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(quiz)}
              >
                Edit
              </Button>
              {quiz.status === "published" && (
                <Button size="sm" onClick={() => begin(quiz)}>
                  Take quiz
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setHistoryQuizId(historyQuizId === quiz.id ? null : quiz.id)
                }
              >
                Attempts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${quiz.title}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${quiz.title}? Previous attempts are kept.`
                    )
                  )
                    void run(async () => {
                      if (
                        typeof navigator !== "undefined" &&
                        !navigator.onLine
                      ) {
                        queueMutation({
                          clientMutationId: crypto.randomUUID(),
                          entityType: "quiz",
                          operation: "delete",
                          entityId: quiz.id,
                          expectedRevision: quiz.revision,
                          payload: {},
                        });
                        return;
                      }
                      await api.delete(quiz.id, quiz.revision);
                      await refresh();
                    });
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {historyQuizId === quiz.id && (
              <div className="mt-3 space-y-1 border-t pt-2">
                {history.isLoading
                  ? "Loading attempts…"
                  : !history.data?.length
                    ? "No attempts yet."
                    : history.data.map((item) => (
                        <Button
                          key={item.id}
                          variant="ghost"
                          className="h-11 w-full justify-start text-left"
                          onClick={() => review(item.id)}
                        >
                          {new Date(item.startedAt).toLocaleString()} ·{" "}
                          {item.status === "submitted"
                            ? `${item.scorePercent}%`
                            : "Continue"}
                        </Button>
                      ))}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  question: QuizQuestionInput;
  index: number;
  count: number;
  onChange: (value: QuizQuestionInput) => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
}) {
  const changeOption = (
    optionIndex: number,
    patch: Partial<QuizQuestionInput["options"][number]>
  ) =>
    onChange({
      ...question,
      options: question.options.map((option, i) =>
        i === optionIndex ? { ...option, ...patch } : option
      ),
    });
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 font-medium">Question {index + 1}</legend>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          Move up
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          Move down
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <Label htmlFor={`quiz-prompt-${index}`}>Question</Label>
      <Input
        id={`quiz-prompt-${index}`}
        className="h-11"
        value={question.prompt}
        onChange={(e) => onChange({ ...question, prompt: e.target.value })}
        required
      />
      <Label htmlFor={`quiz-type-${index}`}>Answer type</Label>
      <select
        id={`quiz-type-${index}`}
        value={question.type}
        onChange={(e) =>
          onChange({
            ...question,
            type: e.target.value as "single" | "multiple",
            options: question.options.map((o, i) => ({
              ...o,
              isCorrect: i === 0,
            })),
          })
        }
        className="h-11 w-full rounded-md border bg-background px-2 text-sm"
      >
        <option value="single">Choose one</option>
        <option value="multiple">Select all that apply</option>
      </select>
      <p className="text-sm text-muted-foreground">
        Mark {question.type === "single" ? "one" : "every"} correct answer.
      </p>
      {question.options.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center gap-2">
          <input
            aria-label={`Option ${optionIndex + 1} is correct`}
            type={question.type === "single" ? "radio" : "checkbox"}
            name={`correct-${index}`}
            checked={option.isCorrect}
            onChange={() =>
              onChange({
                ...question,
                options: question.options.map((o, i) => ({
                  ...o,
                  isCorrect:
                    question.type === "single"
                      ? i === optionIndex
                      : i === optionIndex
                        ? !o.isCorrect
                        : o.isCorrect,
                })),
              })
            }
            className="h-5 w-5 shrink-0"
          />
          <Input
            aria-label={`Option ${optionIndex + 1}`}
            className="h-11 min-w-0"
            value={option.text}
            onChange={(e) =>
              changeOption(optionIndex, { text: e.target.value })
            }
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label={`Remove option ${optionIndex + 1}`}
            disabled={question.options.length <= 2}
            onClick={() =>
              onChange({
                ...question,
                options: question.options.filter((_, i) => i !== optionIndex),
              })
            }
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={question.options.length >= 12}
        onClick={() =>
          onChange({
            ...question,
            options: [...question.options, { text: "", isCorrect: false }],
          })
        }
      >
        <Plus aria-hidden="true" /> Add option
      </Button>
      <Label htmlFor={`quiz-explanation-${index}`}>
        Explanation (optional)
      </Label>
      <textarea
        id={`quiz-explanation-${index}`}
        value={question.explanation ?? ""}
        onChange={(e) => onChange({ ...question, explanation: e.target.value })}
        rows={2}
        className="w-full rounded-md border bg-background p-2 text-sm"
      />
    </fieldset>
  );
}
