export type AIProviderId = "gemini" | "groq" | "nim";

export type AIModelCapability =
  | "quiz_generation"
  | "study_planning"
  | "learning_assistant"
  | "concept_extraction";

export interface AIModelMetadata {
  id: string;
  name: string;
  provider: AIProviderId;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  recommendedFor: AIModelCapability[];
}

export type AIProviderStatus =
  | "unconfigured"
  | "configured"
  | "verified"
  | "error";

export interface AIProviderConfig {
  id: string;
  userId: string;
  provider: AIProviderId;
  hasKey: boolean;
  keyMask: string | null;
  defaultModel: string | null;
  customEndpoint: string | null;
  isEnabled: boolean;
  status: AIProviderStatus;
  lastVerifiedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIUserSettings {
  id: string;
  userId: string;
  aiEnabled: boolean;
  defaultProvider: AIProviderId;
  fallbackProviders: AIProviderId[];
  allowFallback: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAIProviderConfigInput {
  provider: AIProviderId;
  apiKey?: string;
  defaultModel?: string | null;
  customEndpoint?: string | null;
  isEnabled?: boolean;
}

export interface UpdateAIUserSettingsInput {
  aiEnabled?: boolean;
  defaultProvider?: AIProviderId;
  fallbackProviders?: AIProviderId[];
  allowFallback?: boolean;
}

export interface TestProviderConnectionResult {
  ok: boolean;
  error?: string;
  models?: string[];
}

export type QuizSourceType = "resource" | "note" | "text";

export interface QuizGenerationInput {
  sourceType: QuizSourceType;
  resourceId?: string;
  noteId?: string;
  pastedText?: string;
  subjectId?: string;
  assignmentId?: string;
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  questionType: "single" | "multiple" | "mixed";
  focusTopics?: string;
}

export interface GeneratedQuizQuestionCandidate {
  type: "single" | "multiple";
  prompt: string;
  explanation?: string | null;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  sourceReference?: string | null;
}

export interface GeneratedQuizCandidate {
  title: string;
  description: string;
  sourceTitle: string;
  sourceType: QuizSourceType;
  questions: GeneratedQuizQuestionCandidate[];
  warnings: string[];
  provider: AIProviderId;
  model: string;
}

export interface StudyPlanSuggestionInput {
  assignmentId: string;
  timezone: string;
  notes?: string;
}

export interface StudyPlanSuggestedDistribution {
  date: string;
  minutes: number;
  reason: string;
}

export interface StudyPlanSuggestionResult {
  summary: string;
  suggestedDistribution: StudyPlanSuggestedDistribution[];
  proposedInput: {
    assignmentId: string;
    timezone: string;
    targetMinutes: number;
    preferredSessionMinutes: number;
    startDate?: string;
    endDate?: string;
  };
  explanation: string;
  provider: AIProviderId;
  model: string;
}

export interface LearningAssistantCitation {
  sourceType: "resource" | "note" | "general";
  title?: string;
  reference?: string;
  snippet?: string;
}

export interface LearningAssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LearningAssistantRequest {
  action: "chat" | "explain" | "summarize" | "revision_notes" | "practice";
  message: string;
  context?: {
    subjectId?: string;
    assignmentId?: string;
    resourceId?: string;
    noteId?: string;
    quizId?: string;
    selectedText?: string;
  };
  history?: LearningAssistantMessage[];
}

export interface LearningAssistantResponse {
  content: string;
  grounded: boolean;
  citations: LearningAssistantCitation[];
  provider: AIProviderId;
  model: string;
}

export interface AITaskHistoryEntry {
  id: string;
  taskType: string;
  provider: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  status: string;
  fallbackFrom: string | null;
  errorMessage: string | null;
  createdAt: string;
}
