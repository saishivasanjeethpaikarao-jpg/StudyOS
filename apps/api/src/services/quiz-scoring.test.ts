import { describe, expect, it } from "vitest";
import { normalizeResourceUrl } from "./learning.js";
import {
  scoreQuiz,
  takingPayload,
  validateQuestions,
  type QuizSnapshotQuestion,
} from "./quiz-scoring.js";

const questions: QuizSnapshotQuestion[] = [
  {
    id: "q1",
    type: "single",
    prompt: "One",
    explanation: "Because one",
    options: [
      { id: "a", text: "A", isCorrect: true },
      { id: "b", text: "B", isCorrect: false },
    ],
  },
  {
    id: "q2",
    type: "multiple",
    prompt: "Several",
    explanation: null,
    options: [
      { id: "c", text: "C", isCorrect: true },
      { id: "d", text: "D", isCorrect: true },
      { id: "e", text: "E", isCorrect: false },
    ],
  },
];

describe("deterministic Knowledge Check scoring", () => {
  it("scores single answer and exact multi-answer sets", () => {
    expect(
      scoreQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["d", "c"] },
      ])
    ).toMatchObject({ correctCount: 2, incorrectCount: 0, scorePercent: 100 });
  });
  it("does not award partial credit or count missing answers correct", () => {
    expect(
      scoreQuiz(questions, [{ questionId: "q2", selectedOptionIds: ["c"] }])
    ).toMatchObject({ correctCount: 0, incorrectCount: 2, scorePercent: 0 });
  });
  it("rejects invalid and duplicate answer selections", () => {
    expect(() =>
      scoreQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["a", "b"] },
      ])
    ).toThrow();
    expect(() =>
      scoreQuiz(questions, [
        { questionId: "q2", selectedOptionIds: ["c", "c"] },
      ])
    ).toThrow();
    expect(() =>
      scoreQuiz(questions, [
        { questionId: "q2", selectedOptionIds: ["foreign"] },
      ])
    ).toThrow();
    expect(() =>
      scoreQuiz(questions, [
        { questionId: "q1", selectedOptionIds: [] },
        { questionId: "q1", selectedOptionIds: [] },
      ])
    ).toThrow();
  });
  it("validates authoring configurations", () => {
    expect(() =>
      validateQuestions([
        {
          type: "single",
          prompt: "Question",
          options: [
            { text: "A", isCorrect: true },
            { text: "B", isCorrect: true },
          ],
        },
      ])
    ).toThrow();
    expect(() =>
      validateQuestions([
        {
          type: "multiple",
          prompt: "Question",
          options: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
          ],
        },
      ])
    ).toThrow();
    expect(() =>
      validateQuestions([
        {
          type: "single",
          prompt: "Question",
          options: [
            { text: "Same", isCorrect: true },
            { text: "same", isCorrect: false },
          ],
        },
      ])
    ).toThrow();
  });
  it("never exposes answer keys or explanations before submission", () => {
    expect(JSON.stringify(takingPayload(questions))).not.toMatch(
      /isCorrect|explanation|Because one/
    );
  });
});

describe("resource URL validation", () => {
  it("normalizes supported YouTube links without API credentials", () => {
    for (const url of [
      "https://youtu.be/dQw4w9WgXcQ?t=20",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(normalizeResourceUrl(url, "youtube")).toEqual({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        providerItemId: "dQw4w9WgXcQ",
      });
    }
  });
  it("rejects malformed, credentialed, non-HTTPS and non-YouTube links", () => {
    for (const url of [
      "file:///etc/passwd",
      "http://youtu.be/dQw4w9WgXcQ",
      "https://user:pass@youtu.be/dQw4w9WgXcQ",
      "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/nope",
    ]) {
      expect(() => normalizeResourceUrl(url, "youtube")).toThrow();
    }
    expect(() => normalizeResourceUrl("javascript:alert(1)", "web")).toThrow();
  });
});
