/**
 * Automations Background Worker
 * Evaluates and executes student-configured scheduled automations (e.g. daily briefings, due reminders).
 * Runs every minute to evaluate scheduled times across all student timezones.
 */
import { getPgBoss, JOBS } from "../../lib/pgboss.js";
import { AutomationsService } from "../../services/integrations/automations.js";

function isAutomationsEnabled(): boolean {
  return process.env.AUTOMATIONS_ENABLED !== "false";
}

export async function registerAutomationsWorkers(): Promise<void> {
  if (!isAutomationsEnabled()) {
    console.log("[Automations Worker] Disabled via AUTOMATIONS_ENABLED=false");
    return;
  }

  const boss = await getPgBoss();
  const automationsService = new AutomationsService();

  // Create queue (pg-boss v10+)
  await boss.createQueue(JOBS.AUTOMATION_SCHEDULE_CHECK);

  // Schedule periodic check every minute
  await boss.schedule(
    JOBS.AUTOMATION_SCHEDULE_CHECK,
    "* * * * *",
    {},
    {
      tz: "UTC",
      singletonKey: "automation-schedule-check-schedule",
    }
  );

  // Register worker handler
  await boss.work(
    JOBS.AUTOMATION_SCHEDULE_CHECK,
    async () => {
      try {
        const results = await automationsService.processScheduledAutomations();
        if (results.length > 0) {
          console.log(`[Automations Worker] Executed ${results.length} scheduled automations`);
        }
      } catch (err) {
        console.error("[Automations Worker] Error evaluating automations:", err);
      }
    }
  );

  console.log("[Automations Worker] Registered and scheduled");
}
