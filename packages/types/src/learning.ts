/** Phase 3 wire contracts; timestamps are ISO-8601 strings on the API. */
export type LearningTarget = {
  subjectId?: string | null;
  assignmentId?: string | null;
  studySessionId?: string | null;
};
export interface LearningResource {
  id: string;
  userId: string;
  type: "file" | "youtube" | "web";
  title: string;
  url: string | null;
  storageKey: string | null;
  mimeType: string | null;
  filename: string | null;
  sizeBytes: number | null;
  providerItemId: string | null;
  completedAt: string | null;
  revision: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ResourceLink extends LearningTarget {
  id: string;
  resourceId: string;
  userId: string;
  createdAt: string;
}
export interface StudyNote extends LearningTarget {
  id: string;
  userId: string;
  title: string;
  body: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface StudyReminder extends LearningTarget {
  id: string;
  userId: string;
  title: string;
  remindAt: string;
  quizId: string | null;
  state: "pending" | "dismissed" | "cancelled";
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface AcademicFocusSession extends LearningTarget {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  state: "active" | "completed" | "cancelled";
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface QuizOptionAuthor {
  id: string;
  questionId: string;
  text: string;
  position: number;
  isCorrect: boolean;
}
export interface QuizQuestionAuthor {
  id: string;
  quizId: string;
  type: "single" | "multiple";
  prompt: string;
  explanation: string | null;
  position: number;
  sourceResourceId: string | null;
  sourceReference: string | null;
  provenance: Record<string, unknown> | null;
  options: QuizOptionAuthor[];
}
export interface QuizSummary {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  subjectId: string | null;
  assignmentId: string | null;
  resourceId: string | null;
  status: "draft" | "published";
  revision: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface QuizAuthor extends QuizSummary {
  questions: QuizQuestionAuthor[];
}
export interface QuizQuestionInput {
  type: "single" | "multiple";
  prompt: string;
  explanation?: string | null;
  options: { text: string; isCorrect: boolean }[];
  sourceResourceId?: string | null;
  sourceReference?: string | null;
}
export interface QuizInput {
  title: string;
  description?: string | null;
  subjectId?: string | null;
  assignmentId?: string | null;
  resourceId?: string | null;
  status: "draft" | "published";
  questions: QuizQuestionInput[];
}
export interface QuizTakingQuestion {
  id: string;
  type: "single" | "multiple";
  prompt: string;
  options: { id: string; text: string }[];
}
export interface QuizPlay {
  id: string;
  title: string;
  description: string | null;
  questions: QuizTakingQuestion[];
}
export interface QuizAttemptSummary {
  id: string;
  quizId: string;
  status: "started" | "submitted";
  startedAt: string;
  submittedAt?: string | null;
  correctCount?: number | null;
  totalQuestions?: number;
  scorePercent?: number | null;
}
export interface QuizAttemptStarted extends QuizAttemptSummary {
  questions: QuizTakingQuestion[];
}
export interface QuizAttemptResult extends QuizAttemptSummary {
  submittedAt: string;
  correctCount: number;
  totalQuestions: number;
  incorrectCount: number;
  scorePercent: number;
  questions: {
    id: string;
    type: "single" | "multiple";
    prompt: string;
    explanation: string | null;
    options: { id: string; text: string; isCorrect: boolean }[];
  }[];
  answers: {
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
  }[];
}
