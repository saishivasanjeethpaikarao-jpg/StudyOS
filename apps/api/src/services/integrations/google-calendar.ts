import {
  getDb,
  eq,
  and,
  like,
  studySessions,
  assignments,
  subjects,
  calendarAccounts,
  calendars,
  calendarEvents,
  integrationAuditLogs,
} from "@open-sunsama/database";
import { GoogleCalendarProvider } from "../calendar-providers/google.js";
import { getAccessTokenForProvider } from "../calendar-sync.js";

export interface ExportSessionResult {
  success: boolean;
  externalEventId?: string;
  action: "created" | "updated" | "deleted" | "skipped";
  error?: string;
}

export class GoogleCalendarIntegrationService {
  private provider = new GoogleCalendarProvider();

  /**
   * Export an approved StudyOS study session to the user's primary/chosen Google Calendar.
   */
  async exportStudySession(
    userId: string,
    sessionId: string,
    calendarIdOverride?: string
  ): Promise<ExportSessionResult> {
    const db = getDb();

    // 1. Fetch study session with assignment and subject
    const [session] = await db
      .select({
        id: studySessions.id,
        assignmentId: studySessions.assignmentId,
        startAt: studySessions.startAt,
        endAt: studySessions.endAt,
        timezone: studySessions.timezone,
        plannedMinutes: studySessions.plannedMinutes,
        status: studySessions.status,
        assignmentTitle: assignments.title,
        subjectId: assignments.subjectId,
      })
      .from(studySessions)
      .innerJoin(assignments, eq(studySessions.assignmentId, assignments.id))
      .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)))
      .limit(1);

    if (!session) {
      return { success: false, action: "skipped", error: "Study session not found" };
    }

    // Fetch subject name if present
    let subjectName = "General Study";
    if (session.subjectId) {
      const [subj] = await db
        .select({ name: subjects.name })
        .from(subjects)
        .where(eq(subjects.id, session.subjectId))
        .limit(1);
      if (subj) subjectName = subj.name;
    }

    // 2. Fetch active Google Calendar account
    const [googleAccount] = await db
      .select()
      .from(calendarAccounts)
      .where(
        and(
          eq(calendarAccounts.userId, userId),
          eq(calendarAccounts.provider, "google"),
          eq(calendarAccounts.isActive, true)
        )
      )
      .limit(1);

    if (!googleAccount) {
      return {
        success: false,
        action: "skipped",
        error: "No active Google Calendar account connected",
      };
    }

    // 3. Resolve target calendar
    let targetCalendarId = calendarIdOverride;
    if (!targetCalendarId) {
      const [defaultCal] = await db
        .select({ externalId: calendars.externalId })
        .from(calendars)
        .where(
          and(
            eq(calendars.userId, userId),
            eq(calendars.accountId, googleAccount.id),
            eq(calendars.isDefaultForEvents, true)
          )
        )
        .limit(1);

      targetCalendarId = defaultCal?.externalId || "primary";
    }

    // 4. Resolve access token
    let accessToken: string;
    try {
      accessToken = await getAccessTokenForProvider(googleAccount, this.provider);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to obtain Google access token";
      await this.logAudit(userId, "export_session", "failure", { sessionId }, errorMsg);
      return { success: false, action: "skipped", error: errorMsg };
    }

    const eventTitle = `[StudyOS] ${subjectName}: ${session.assignmentTitle}`;
    const webAppUrl = process.env.WEB_APP_URL || "http://localhost:3000";
    const eventDescription = [
      `StudyOS Scheduled Session`,
      `Subject: ${subjectName}`,
      `Assignment: ${session.assignmentTitle}`,
      `Planned Duration: ${session.plannedMinutes} mins`,
      `View in StudyOS: ${webAppUrl}/app/study-sessions/${session.id}`,
    ].join("\n");

    // Check if session was already exported with dual ownership verification:
    // 1. Check calendarEvents table for matching tag and userId
    let [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          like(calendarEvents.description, `%[studyos_session:${sessionId}]%`)
        )
      )
      .limit(1);

    // 2. If not found by tag, check integrationAuditLogs for audited externalEventId link
    if (!existingEvent) {
      const auditRows = await db
        .select()
        .from(integrationAuditLogs)
        .where(
          and(
            eq(integrationAuditLogs.userId, userId),
            eq(integrationAuditLogs.action, "create_session_event"),
            eq(integrationAuditLogs.status, "success")
          )
        )
        .orderBy(integrationAuditLogs.createdAt);

      const matchingAudit = auditRows.reverse().find(
        (r) => (r.details as Record<string, unknown>)?.sessionId === sessionId
      );

      if (matchingAudit && (matchingAudit.details as Record<string, unknown>)?.externalEventId) {
        const auditedExtId = String((matchingAudit.details as Record<string, unknown>).externalEventId);
        const [eventByAudit] = await db
          .select()
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.userId, userId),
              eq(calendarEvents.externalId, auditedExtId)
            )
          )
          .limit(1);

        if (eventByAudit) {
          existingEvent = eventByAudit;
        }
      }
    }

    try {
      if (session.status === "cancelled") {
        if (existingEvent?.externalId) {
          await this.provider.deleteEvent?.(
            accessToken,
            targetCalendarId,
            existingEvent.externalId
          );
          await db
            .delete(calendarEvents)
            .where(eq(calendarEvents.id, existingEvent.id));
          await this.logAudit(userId, "delete_session_event", "success", {
            sessionId,
            externalEventId: existingEvent.externalId,
          });
          return { success: true, action: "deleted" };
        }
        return { success: true, action: "skipped" };
      }

      if (existingEvent?.externalId) {
        // Update existing event
        const updated = await this.provider.updateEvent(
          accessToken,
          targetCalendarId,
          existingEvent.externalId,
          {
            title: eventTitle,
            description: `${eventDescription}\n\n[studyos_session:${sessionId}]`,
            startTime: session.startAt,
            endTime: session.endAt,
            timezone: session.timezone,
            isAllDay: false,
          }
        );

        await db
          .update(calendarEvents)
          .set({
            title: eventTitle,
            startTime: session.startAt,
            endTime: session.endAt,
            timezone: session.timezone,
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, existingEvent.id));

        await this.logAudit(userId, "update_session_event", "success", {
          sessionId,
          externalEventId: updated.externalId,
        });
        return {
          success: true,
          action: "updated",
          externalEventId: updated.externalId,
        };
      }

      // Create new event
      const created = await this.provider.createEvent(
        accessToken,
        targetCalendarId,
        {
          title: eventTitle,
          description: `${eventDescription}\n\n[studyos_session:${sessionId}]`,
          startTime: session.startAt,
          endTime: session.endAt,
          timezone: session.timezone,
          isAllDay: false,
        }
      );

      // Record in calendarEvents to ensure duplicate prevention
      const [calRow] = await db
        .select({ id: calendars.id })
        .from(calendars)
        .where(
          and(
            eq(calendars.userId, userId),
            eq(calendars.externalId, targetCalendarId)
          )
        )
        .limit(1);

      if (calRow) {
        await db.insert(calendarEvents).values({
          calendarId: calRow.id,
          userId,
          externalId: created.externalId,
          title: eventTitle,
          description: `[studyos_session:${sessionId}]`,
          startTime: session.startAt,
          endTime: session.endAt,
          timezone: session.timezone,
          status: "confirmed",
        });
      }

      await this.logAudit(userId, "create_session_event", "success", {
        sessionId,
        externalEventId: created.externalId,
      });

      return {
        success: true,
        action: "created",
        externalEventId: created.externalId,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Google Calendar API error";
      await this.logAudit(userId, "export_session", "failure", { sessionId }, errorMsg);
      return { success: false, action: "skipped", error: errorMsg };
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    status: "success" | "failure" | "warning",
    details: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> {
    try {
      await getDb().insert(integrationAuditLogs).values({
        userId,
        integrationType: "google_calendar",
        action,
        status,
        details,
        errorMessage: errorMessage || null,
      });
    } catch {
      // Non-blocking audit failure
    }
  }
}
