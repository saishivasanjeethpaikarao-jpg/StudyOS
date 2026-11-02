import type {
  IntegrationConnectionSummary,
  DriveFileItem,
  DriveImportPayload,
  TelegramLinkResponse,
  TelegramSettings,
  UpdateTelegramSettingsInput,
  AgentConnectionStatus,
  AgentTokenCreateResponse,
  AgentDraftProposal,
  AutomationDefinition,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationExecutionLog,
  IntegrationAuditLogEntry,
} from "@open-sunsama/types";
import type { OpenSunsamaClient } from "./client.js";

type Result<T> = { success: true; data: T };

export function createIntegrationsApi(client: OpenSunsamaClient) {
  return {
    getStatus: async () =>
      (await client.get<Result<IntegrationConnectionSummary[]>>("integrations/status")).data,

    exportSessionToCalendar: async (sessionId: string, calendarId?: string) =>
      (
        await client.post<Result<{ success: boolean; externalEventId?: string; action: string }>>(
          `integrations/google-calendar/export-session/${sessionId}`,
          { calendarId }
        )
      ).data,

    listDriveFiles: async (query?: string, pageSize = 25) =>
      (
        await client.get<Result<{ files: DriveFileItem[]; nextPageToken?: string }>>(
          "integrations/google-drive/files",
          {
            searchParams: {
              ...(query ? { q: query } : {}),
              pageSize: String(pageSize),
            },
          }
        )
      ).data,

    importDriveFile: async (payload: DriveImportPayload) =>
      (
        await client.post<Result<{ resourceId: string; title: string; sizeBytes: number }>>(
          "integrations/google-drive/import",
          payload
        )
      ).data,

    getTelegramLinkCode: async () =>
      (await client.post<Result<TelegramLinkResponse>>("integrations/telegram/link-code")).data,

    getTelegramSettings: async () =>
      (await client.get<Result<TelegramSettings>>("integrations/telegram/settings")).data,

    updateTelegramSettings: async (updates: UpdateTelegramSettingsInput) =>
      (await client.put<Result<TelegramSettings>>("integrations/telegram/settings", updates)).data,

    disconnectTelegram: async () => {
      await client.post("integrations/telegram/disconnect");
    },

    getAgentStatus: async () =>
      (await client.get<Result<AgentConnectionStatus>>("integrations/agent/status")).data,

    generateAgentToken: async () =>
      (await client.post<Result<AgentTokenCreateResponse>>("integrations/agent/token")).data,

    revokeAgentToken: async () => {
      await client.delete("integrations/agent/token");
    },

    dispatchAgentWorkflow: async (workflowType: string, params?: Record<string, unknown>) =>
      (
        await client.post<Result<{ result: Record<string, unknown>; proposalCreated?: boolean }>>(
          "integrations/agent/dispatch",
          { workflowType, params }
        )
      ).data,

    listAgentProposals: async () =>
      (await client.get<Result<AgentDraftProposal[]>>("integrations/agent/proposals")).data,

    confirmAgentProposal: async (id: string) =>
      (
        await client.post<Result<{ success: boolean; actionTaken: string }>>(
          `integrations/agent/proposals/${id}/confirm`
        )
      ).data,

    rejectAgentProposal: async (id: string) => {
      await client.post(`integrations/agent/proposals/${id}/reject`);
    },

    listAutomations: async () =>
      (await client.get<Result<AutomationDefinition[]>>("integrations/automations")).data,

    createAutomation: async (input: CreateAutomationInput) =>
      (await client.post<Result<AutomationDefinition>>("integrations/automations", input)).data,

    updateAutomation: async (id: string, input: UpdateAutomationInput) =>
      (await client.put<Result<AutomationDefinition>>(`integrations/automations/${id}`, input)).data,

    deleteAutomation: async (id: string) => {
      await client.delete(`integrations/automations/${id}`);
    },

    runAutomation: async (id: string) =>
      (
        await client.post<Result<{ status: "success" | "failed" | "skipped"; summary: string }>>(
          `integrations/automations/${id}/run`
        )
      ).data,

    getAutomationLogs: async (id: string) =>
      (
        await client.get<Result<AutomationExecutionLog[]>>(
          `integrations/automations/${id}/history`
        )
      ).data,

    getAuditLogs: async () =>
      (await client.get<Result<IntegrationAuditLogEntry[]>>("integrations/audit-logs")).data,
  };
}
