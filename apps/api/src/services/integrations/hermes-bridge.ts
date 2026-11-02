import crypto from "node:crypto";
import {
  getDb,
  eq,
  and,
  desc,
  studySessions,
  assignments,
  subjects,
  resources,
  studyNotes,
  studyReminders,
  agentConnections,
  agentProposals,
  integrationAuditLogs,
} from "@open-sunsama/database";
import type {
  AgentConnectionStatus,
  AgentTokenCreateResponse,
  AgentWorkflowType,
  AgentDraftProposal,
  AgentProposedAction,
} from "@open-sunsama/types";

export const ALLOWED_HERMES_WORKFLOWS: AgentWorkflowType[] = [
  "academic_workload_summary",
  "daily_briefing",
  "revision_plan_proposal",
  "resource_finder",
  "study_plan_suggestion",
];

export const ALLOWED_HERMES_SCOPES = [
  "study:read",
  "plan:propose",
  "reminder:propose",
  "notes:write",
];

export class HermesBridgeService {
  /**
   * Generate an Agent API token for Hermes (e.g., `so_agent_...`).
   * Stored as SHA-256 hash in database; raw token returned only once.
   */
  async generateAgentToken(
    userId: string,
    name = "Hermes Agent",
    scopes = ALLOWED_HERMES_SCOPES
  ): Promise<AgentTokenCreateResponse> {
    const rawToken = `so_agent_${crypto.randomBytes(24).toString("hex")}`;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const db = getDb();
    await db
      .insert(agentConnections)
      .values({
        userId,
        name,
        tokenHash,
        scopes,
        capabilities: ["workload_summary", "briefing", "plan_proposals"],
        allowedWorkflows: ALLOWED_HERMES_WORKFLOWS,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: agentConnections.userId,
        set: {
          name,
          tokenHash,
          scopes,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    await db.insert(integrationAuditLogs).values({
      userId,
      integrationType: "hermes",
      action: "generate_token",
      status: "success",
      details: { scopes },
    });

    return {
      token: rawToken,
      scopes,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Authenticate incoming agent request using token hash.
   */
  async authenticateAgent(rawToken: string): Promise<{ userId: string; scopes: string[] } | null> {
    if (!rawToken || !rawToken.startsWith("so_agent_")) return null;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const db = getDb();
    const [conn] = await db
      .select({
        userId: agentConnections.userId,
        scopes: agentConnections.scopes,
        isActive: agentConnections.isActive,
      })
      .from(agentConnections)
      .where(and(eq(agentConnections.tokenHash, tokenHash), eq(agentConnections.isActive, true)))
      .limit(1);

    if (!conn) return null;
    return { userId: conn.userId, scopes: conn.scopes };
  }

  /**
   * Get agent connection status.
   */
  async getStatus(userId: string): Promise<AgentConnectionStatus> {
    const db = getDb();
    const [conn] = await db
      .select()
      .from(agentConnections)
      .where(eq(agentConnections.userId, userId))
      .limit(1);

    if (!conn) {
      return {
        isEnabled: false,
        isOnline: false,
        lastHeartbeatAt: null,
        capabilities: [],
        allowedWorkflows: ALLOWED_HERMES_WORKFLOWS,
        tokenCreated: false,
      };
    }

    const isOnline =
      conn.lastHeartbeatAt !== null &&
      Date.now() - new Date(conn.lastHeartbeatAt).getTime() < 5 * 60 * 1000; // 5 mins heartbeat threshold

    return {
      isEnabled: conn.isActive,
      isOnline,
      lastHeartbeatAt: conn.lastHeartbeatAt ? new Date(conn.lastHeartbeatAt).toISOString() : null,
      capabilities: conn.capabilities || [],
      allowedWorkflows: conn.allowedWorkflows || ALLOWED_HERMES_WORKFLOWS,
      tokenCreated: true,
    };
  }

  /**
   * Record agent heartbeat.
   */
  async recordHeartbeat(userId: string, capabilities?: string[]): Promise<void> {
    const db = getDb();
    await db
      .update(agentConnections)
      .set({
        lastHeartbeatAt: new Date(),
        ...(capabilities ? { capabilities } : {}),
        updatedAt: new Date(),
      })
      .where(eq(agentConnections.userId, userId));
  }

  /**
   * Revoke agent connection.
   */
  async revokeConnection(userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(agentConnections)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(agentConnections.userId, userId));

    await db.insert(integrationAuditLogs).values({
      userId,
      integrationType: "hermes",
      action: "revoke_connection",
      status: "success",
    });
  }

  /**
   * Dispatch an approved Hermes workflow.
   * Hermes never performs destructive mutations directly. Any recommendation
   * is staged as a draft proposal requiring student confirmation.
   */
  async executeWorkflow(
    userId: string,
    workflowType: AgentWorkflowType,
    params?: Record<string, unknown>
  ): Promise<{ result: Record<string, unknown>; proposalCreated?: boolean }> {
    const db = getDb();

    switch (workflowType) {
      case "academic_workload_summary": {
        const activeAssignments = await db
          .select({
            id: assignments.id,
            title: assignments.title,
            dueAt: assignments.dueAt,
            estimatedMinutes: assignments.estimatedMinutes,
          })
          .from(assignments)
          .where(and(eq(assignments.userId, userId), eq(assignments.status, "in_progress")));

        const totalEstimatedMins = activeAssignments.reduce(
          (acc, a) => acc + (a.estimatedMinutes || 60),
          0
        );

        return {
          result: {
            assignmentCount: activeAssignments.length,
            totalEstimatedMinutes: totalEstimatedMins,
            assignments: activeAssignments,
          },
        };
      }

      case "daily_briefing": {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const sessions = await db
          .select({
            id: studySessions.id,
            startAt: studySessions.startAt,
            plannedMinutes: studySessions.plannedMinutes,
            status: studySessions.status,
            assignmentTitle: assignments.title,
          })
          .from(studySessions)
          .innerJoin(assignments, eq(studySessions.assignmentId, assignments.id))
          .where(
            and(
              eq(studySessions.userId, userId),
              eq(studySessions.status, "planned")
            )
          );

        return {
          result: {
            plannedSessionCount: sessions.length,
            totalPlannedMinutes: sessions.reduce((acc, s) => acc + s.plannedMinutes, 0),
            sessions,
          },
        };
      }

      case "revision_plan_proposal": {
        // Create an approval-gated draft proposal
        const [proposal] = await db
          .insert(agentProposals)
          .values({
            userId,
            workflowType: "revision_plan_proposal",
            title: "Hermes Suggested Revision Block",
            summary: "Proposed a 45-minute active recall review session for upcoming exams.",
            proposedAction: "create_session",
            payload: {
              plannedMinutes: 45,
              notes: "Review flashcards and core summary points",
              suggestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
            status: "pending_approval",
          })
          .returning();

        if (!proposal) throw new Error("Failed to create proposal");

        return {
          result: {
            proposalId: proposal.id,
            status: "pending_approval",
            message: "Proposal created. Requires student approval to apply.",
          },
          proposalCreated: true,
        };
      }

      default:
        return {
          result: {
            workflow: workflowType,
            message: "Workflow executed within safe sandbox boundary.",
          },
        };
    }
  }

  /**
   * List pending proposals for student review.
   */
  async listPendingProposals(userId: string): Promise<AgentDraftProposal[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(agentProposals)
      .where(and(eq(agentProposals.userId, userId), eq(agentProposals.status, "pending_approval")))
      .orderBy(desc(agentProposals.createdAt));

    return rows.map((r) => ({
      id: r.id,
      workflowType: r.workflowType as AgentWorkflowType,
      title: r.title,
      summary: r.summary,
      proposedAction: r.proposedAction as AgentProposedAction,
      payload: r.payload,
      status: r.status as "pending_approval" | "approved" | "rejected",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Student confirms a proposed action.
   */
  async confirmProposal(
    userId: string,
    proposalId: string
  ): Promise<{ success: boolean; actionTaken: string }> {
    const db = getDb();
    const [proposal] = await db
      .select()
      .from(agentProposals)
      .where(and(eq(agentProposals.id, proposalId), eq(agentProposals.userId, userId)))
      .limit(1);

    if (!proposal || proposal.status !== "pending_approval") {
      throw new Error("Proposal not found or already processed");
    }

    if (proposal.proposedAction === "create_reminder") {
      const payload = proposal.payload as { title: string; remindAt: string };
      await db.insert(studyReminders).values({
        userId,
        title: payload.title || proposal.title,
        remindAt: new Date(payload.remindAt || Date.now() + 60 * 60 * 1000),
        state: "pending",
      });
    } else if (proposal.proposedAction === "create_note") {
      const payload = proposal.payload as { title: string; content?: string; body?: string };
      await db.insert(studyNotes).values({
        userId,
        title: payload.title || proposal.title,
        body: payload.body || payload.content || "Study note created via Hermes Agent recommendation.",
      });
    }

    await db
      .update(agentProposals)
      .set({
        status: "approved",
        reviewedAt: new Date(),
      })
      .where(eq(agentProposals.id, proposal.id));

    await db.insert(integrationAuditLogs).values({
      userId,
      integrationType: "hermes",
      action: "confirm_proposal",
      status: "success",
      details: { proposalId, action: proposal.proposedAction },
    });

    return { success: true, actionTaken: proposal.proposedAction };
  }

  /**
   * Student rejects a proposed action.
   */
  async rejectProposal(userId: string, proposalId: string): Promise<void> {
    const db = getDb();
    await db
      .update(agentProposals)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
      })
      .where(and(eq(agentProposals.id, proposalId), eq(agentProposals.userId, userId)));

    await db.insert(integrationAuditLogs).values({
      userId,
      integrationType: "hermes",
      action: "reject_proposal",
      status: "success",
      details: { proposalId },
    });
  }
}
