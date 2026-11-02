import type {
  AIModelMetadata,
  AIProviderConfig,
  AIProviderId,
  AITaskHistoryEntry,
  AIUserSettings,
  GeneratedQuizCandidate,
  LearningAssistantRequest,
  LearningAssistantResponse,
  QuizGenerationInput,
  StudyPlanPreview,
  StudyPlanSuggestionInput,
  StudyPlanSuggestionResult,
  TestProviderConnectionResult,
  UpdateAIProviderConfigInput,
  UpdateAIUserSettingsInput,
} from "@open-sunsama/types";
import type { OpenSunsamaClient } from "./client.js";

type Result<T> = { success: true; data: T };

export interface AIProviderListItem {
  id: AIProviderId;
  displayName: string;
  defaultModel: string;
  models: AIModelMetadata[];
}

export interface AISettingsResponse {
  settings: AIUserSettings;
  configs: AIProviderConfig[];
}

export interface EnhancedStudyPlanSuggestionResult extends StudyPlanSuggestionResult {
  preview: StudyPlanPreview;
}

export function createAiApi(client: OpenSunsamaClient) {
  return {
    getSettings: async () =>
      (await client.get<Result<AISettingsResponse>>("ai/settings")).data,

    updateSettings: async (input: UpdateAIUserSettingsInput) =>
      (await client.patch<Result<AIUserSettings>>("ai/settings", input)).data,

    getProviders: async () =>
      (await client.get<Result<AIProviderListItem[]>>("ai/providers")).data,

    updateProvider: async (
      provider: AIProviderId,
      input: Omit<UpdateAIProviderConfigInput, "provider">
    ) =>
      (
        await client.put<Result<AIProviderConfig>>(`ai/providers/${provider}`, input)
      ).data,

    deleteProvider: async (provider: AIProviderId) => {
      await client.delete(`ai/providers/${provider}`);
    },

    testProvider: async (
      provider: AIProviderId,
      input?: { apiKey?: string; customEndpoint?: string | null }
    ) =>
      (
        await client.post<Result<TestProviderConnectionResult>>(
          `ai/providers/${provider}/test`,
          input || {}
        )
      ).data,

    generateQuiz: async (input: QuizGenerationInput) =>
      (await client.post<Result<GeneratedQuizCandidate>>("ai/quiz/generate", input)).data,

    suggestPlan: async (input: StudyPlanSuggestionInput) =>
      (
        await client.post<Result<EnhancedStudyPlanSuggestionResult>>(
          "ai/plan/suggest",
          input
        )
      ).data,

    assistantChat: async (input: LearningAssistantRequest) =>
      (await client.post<Result<LearningAssistantResponse>>("ai/assistant/chat", input)).data,

    getHistory: async () =>
      (await client.get<Result<AITaskHistoryEntry[]>>("ai/history")).data,
  };
}

export type AiApi = ReturnType<typeof createAiApi>;
