/**
 * MCP configuration generation utilities
 * Extracted from mcp-settings.tsx for reuse in command palette
 */

const PRIMARY_MCP_KEY_STORAGE = "studyos_mcp_key";
const LEGACY_MCP_KEY_STORAGE = "opensunsama_mcp_key";

export type McpClient = "cursor" | "claude" | "vscode" | "windsurf";

/**
 * Generate MCP configuration JSON for a specific client
 */
export function generateMcpConfig(
  client: McpClient,
  apiKey: string,
  apiUrl: string = "https://studyos-api-wy5w.onrender.com"
): string {
  const baseConfig = {
    command: "npx",
    args: ["-y", "@open-sunsama/mcp"],
    env: {
      STUDYOS_API_KEY: apiKey,
      OPENSUNSAMA_API_KEY: apiKey,
      ...(apiUrl !== "https://studyos-api-wy5w.onrender.com" && {
        STUDYOS_API_URL: apiUrl,
        OPENSUNSAMA_API_URL: apiUrl,
      }),
    },
  };

  // VS Code uses different format (array of servers)
  if (client === "vscode") {
    return JSON.stringify({
      mcpServers: [{ name: "studyos", ...baseConfig }],
    }, null, 2);
  }

  // Cursor, Claude, Windsurf use object format
  return JSON.stringify({
    mcpServers: { studyos: baseConfig },
  }, null, 2);
}

/**
 * Get the stored MCP API key from localStorage
 */
export function getMcpApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PRIMARY_MCP_KEY_STORAGE) || localStorage.getItem(LEGACY_MCP_KEY_STORAGE);
}

/**
 * Store an MCP API key in localStorage
 */
export function setMcpApiKey(key: string): void {
  localStorage.setItem(PRIMARY_MCP_KEY_STORAGE, key);
  localStorage.setItem(LEGACY_MCP_KEY_STORAGE, key);
}

/**
 * Get display name for MCP client
 */
export function getMcpClientDisplayName(client: McpClient): string {
  const names: Record<McpClient, string> = {
    cursor: "Cursor",
    claude: "Claude Desktop",
    vscode: "VS Code",
    windsurf: "Windsurf",
  };
  return names[client];
}
