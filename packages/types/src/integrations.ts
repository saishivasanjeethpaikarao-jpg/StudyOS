export type IntegrationProvider =
  | "google_calendar"
  | "google_drive"
  | "telegram"
  | "hermes";

export type IntegrationStatus = "active" | "disconnected" | "error" | "pending";

export interface IntegrationConnectionSummary {
  id: string;
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  scopes: string[];
  details?: Record<string, unknown>;
}

export interface GoogleCalendarExportOptions {
  calendarId: string;
  exportStudySessions: boolean;
  prefix?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  iconLink: string | null;
}

export interface DriveImportPayload {
  fileId: string;
  fileName: string;
  link?: {
    subjectId?: string;
    assignmentId?: string;
    studySessionId?: string;
  };
}

export interface TelegramLinkResponse {
  linkCode: string;
  botUsername: string;
  deepLink: string;
  expiresAt: string;
}

export interface TelegramSettings {
  isEnabled: boolean;
  chatId: string | null;
  username: string | null;
  notifySessionReminders: boolean;
  notifyDueDates: boolean;
  notifyDailyBriefing: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface UpdateTelegramSettingsInput {
  isEnabled?: boolean;
  notifySessionReminders?: boolean;
  notifyDueDates?: boolean;
  notifyDailyBriefing?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface AgentConnectionStatus {
  isEnabled: boolean;
  isOnline: boolean;
  lastHeartbeatAt: string | null;
  capabilities: string[];
  allowedWorkflows: string[];
  tokenCreated: boolean;
}

export interface AgentTokenCreateResponse {
  token: string;
  scopes: string[];
  createdAt: string;
}

export type AgentWorkflowType =
  | "academic_workload_summary"
  | "daily_briefing"
  | "revision_plan_proposal"
  | "resource_finder"
  | "study_plan_suggestion";

export type AgentProposedAction =
  | "create_session"
  | "create_reminder"
  | "update_assignment"
  | "create_note";

export interface AgentDraftProposal {
  id: string;
  workflowType: AgentWorkflowType;
  title: string;
  summary: string;
  proposedAction: AgentProposedAction;
  payload: Record<string, unknown>;
  status: "pending_approval" | "approved" | "rejected";
  createdAt: string;
}

export type AutomationWorkflowType =
  | "daily_briefing"
  | "assignment_due_reminder"
  | "session_reminder"
  | "weekly_progress_summary"
  | "revision_suggestions"
  | "incomplete_assignment_alert";

export type AutomationChannel = "in_app" | "telegram" | "email";

export interface AutomationDefinition {
  id: string;
  title: string;
  workflowType: AutomationWorkflowType;
  scheduleTime: string; // HH:MM
  timezone: string;
  channels: AutomationChannel[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationInput {
  title: string;
  workflowType: AutomationWorkflowType;
  scheduleTime: string; // HH:MM
  timezone?: string;
  channels: AutomationChannel[];
  isActive?: boolean;
}

export interface UpdateAutomationInput {
  title?: string;
  scheduleTime?: string;
  timezone?: string;
  channels?: AutomationChannel[];
  isActive?: boolean;
}

export interface AutomationExecutionLog {
  id: string;
  automationId: string;
  status: "success" | "failed" | "skipped";
  summary: string;
  details?: Record<string, unknown>;
  errorMessage: string | null;
  executedAt: string;
}

export interface IntegrationAuditLogEntry {
  id: string;
  integrationType: string;
  action: string;
  status: "success" | "failure" | "warning";
  details?: Record<string, unknown>;
  errorMessage?: string | null;
  createdAt: string;
}
