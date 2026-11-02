/**
 * Builds the Open Sunsama MCP server with every tool registered.
 *
 * Shared by the stdio CLI (`src/index.ts`, API-key auth) and the API's remote
 * Streamable HTTP endpoint (`/mcp`, OAuth auth). The caller decides how the
 * ApiClient authenticates and which transport to connect.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient, type ApiClientConfig } from "./lib/api-client.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerTimeBlockTools } from "./tools/time-blocks.js";
import { registerSubtaskTools } from "./tools/subtasks.js";
import { registerUserTools } from "./tools/user.js";
import { registerCalendarEventTools } from "./tools/calendar-events.js";
import { registerAcademicTools } from "./tools/academics.js";

export { ApiClient, type ApiClientConfig } from "./lib/api-client.js";
export { MCP_TOOL_SCOPES } from "./lib/define-tool.js";

export const MCP_SERVER_INFO = {
  name: "open-sunsama",
  title: "StudyOS",
  version: "1.2.0",
  websiteUrl: "https://opensunsama.com",
} as const;

const INSTRUCTIONS = `StudyOS is the student's academic operating system: subjects, assignments, study sessions, resources, notes, reminders, and calendar blocks.
- Dates are YYYY-MM-DD in the user's timezone; call get_user_profile if you need the timezone.
- Use get_today_schedule to inspect today's planned sessions and assignments.
- Use suggest_study_plan to generate recommended session distributions.
- Creation of reminders, notes and assignments should follow user authorization.`;

export function createOpenSunsamaMcpServer(
  client: ApiClient | ApiClientConfig
): McpServer {
  const apiClient = client instanceof ApiClient ? client : new ApiClient(client);
  const server = new McpServer(MCP_SERVER_INFO, { instructions: INSTRUCTIONS });

  registerTaskTools(server, apiClient);
  registerTimeBlockTools(server, apiClient);
  registerSubtaskTools(server, apiClient);
  registerCalendarEventTools(server, apiClient);
  registerUserTools(server, apiClient);
  registerAcademicTools(server, apiClient);

  return server;
}
