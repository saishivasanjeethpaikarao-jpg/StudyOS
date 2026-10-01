import { addDays, endOfDay, isSameDay, startOfDay } from "date-fns";
import type { TimeBlock } from "@open-sunsama/types";

/** A projection follows its canonical instant; generic blocks keep local-date semantics. */
export function isCalendarBlockOnDay(
  block: Pick<TimeBlock, "studySessionId" | "startTime" | "endTime">,
  day: Date
): boolean {
  if (!block.studySessionId) return isSameDay(new Date(block.startTime), day);
  return (
    new Date(block.startTime) < endOfDay(day) &&
    new Date(block.endTime) > startOfDay(day)
  );
}

/** Today is the viewer's current local calendar day, expressed as UTC bounds. */
export function todaySessionRange(now: Date): { from: string; to: string } {
  const dayStart = startOfDay(now);
  return {
    from: dayStart.toISOString(),
    to: addDays(dayStart, 1).toISOString(),
  };
}

/** Wall-clock editing for a Study Session always uses its stored IANA zone. */
export function formatSessionLocalInput(
  instant: Date,
  timezone: string
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** Reject nonexistent and ambiguous DST wall times rather than silently moving them. */
export function parseSessionLocalInput(value: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid date and time.");
  const [, year, month, day, hour, minute] = match;
  const wall = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  const normalized = new Date(wall);
  if (
    normalized.toISOString().slice(0, 16) !==
    `${year}-${month}-${day}T${hour}:${minute}`
  ) {
    throw new Error("Choose a valid date and time.");
  }
  const matches: Date[] = [];
  try {
    for (
      let offsetMinutes = -14 * 60;
      offsetMinutes <= 14 * 60;
      offsetMinutes += 15
    ) {
      const candidate = new Date(wall - offsetMinutes * 60_000);
      if (formatSessionLocalInput(candidate, timezone) === value)
        matches.push(candidate);
    }
  } catch {
    throw new Error("The Study Session timezone is invalid.");
  }
  if (matches.length === 0)
    throw new Error(
      "That local time does not exist in this timezone. Choose another time."
    );
  if (matches.length > 1)
    throw new Error(
      "That local time occurs twice in this timezone. Choose another time."
    );
  return matches[0]!;
}
