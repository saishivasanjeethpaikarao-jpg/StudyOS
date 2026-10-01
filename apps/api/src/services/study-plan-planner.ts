import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type {
  NormalizedStudyPlanInput,
  StudyPlanSlot,
} from "@open-sunsama/types";
import { ValidationError } from "@open-sunsama/utils";
import { addDaysToDate } from "../lib/calendar-day-window.js";
import { projectSchedule } from "./study-sessions.js";

export interface BusyTimeBlock {
  date: string;
  startTime: string;
  endTime: string;
}

export interface PlannedStudySlots {
  proposedSlots: StudyPlanSlot[];
  plannedMinutes: number;
  unscheduledMinutes: number;
}

export function isIanaTimezone(timezone: string): boolean {
  if (!/^[A-Za-z]/.test(timezone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Exact effort, with a short final remainder rebalanced when possible. */
export function splitStudyMinutes(
  remainingMinutes: number,
  preferredSessionMinutes: number
): number[] {
  if (
    !Number.isInteger(remainingMinutes) ||
    remainingMinutes < 0 ||
    !Number.isInteger(preferredSessionMinutes) ||
    preferredSessionMinutes < 15
  ) {
    throw new ValidationError("Invalid study effort or session length");
  }
  if (remainingMinutes === 0) return [];
  const durations: number[] = [];
  let remaining = remainingMinutes;
  while (remaining > preferredSessionMinutes) {
    durations.push(preferredSessionMinutes);
    remaining -= preferredSessionMinutes;
  }
  if (remaining < 15 && durations.length > 0) {
    let needed = 15 - remaining;
    for (let index = durations.length - 1; index >= 0 && needed > 0; index--) {
      const available = durations[index]! - 15;
      const moved = Math.min(available, needed);
      durations[index]! -= moved;
      remaining += moved;
      needed -= moved;
    }
  }
  durations.push(remaining);
  return durations;
}

function minutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour! * 60 + minute!;
}

function clock(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

/** Detect a repeated wall time without depending on the server's timezone. */
function isAmbiguousStart(
  localStart: string,
  timezone: string,
  chosen: Date
): boolean {
  const wallUtc = Date.parse(`${localStart.replace(" ", "T")}:00Z`);
  for (const probe of [
    new Date(chosen.getTime() - 86_400_000),
    chosen,
    new Date(chosen.getTime() + 86_400_000),
  ]) {
    const offset = formatInTimeZone(probe, timezone, "xxx");
    const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
    if (!match) continue;
    const minutes =
      (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
    const alternative = new Date(wallUtc - minutes * 60_000);
    if (
      alternative.getTime() !== chosen.getTime() &&
      formatInTimeZone(alternative, timezone, "yyyy-MM-dd HH:mm") === localStart
    )
      return true;
  }
  return false;
}

function candidateSlot(
  localDate: string,
  startMinute: number,
  duration: number,
  input: NormalizedStudyPlanInput,
  now: Date,
  dueAt: Date
): StudyPlanSlot | null {
  const localStart = `${localDate} ${clock(startMinute)}`;
  const startAt = fromZonedTime(
    `${localDate}T${clock(startMinute)}:00`,
    input.timezone
  );
  if (
    !Number.isFinite(startAt.getTime()) ||
    formatInTimeZone(startAt, input.timezone, "yyyy-MM-dd HH:mm") !==
      localStart ||
    isAmbiguousStart(localStart, input.timezone, startAt)
  ) {
    return null; // Nonexistent local time during a DST jump.
  }
  const endAt = new Date(startAt.getTime() + duration * 60_000);
  if (startAt < now || endAt >= dueAt) return null;
  const schedule = {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    timezone: input.timezone,
    plannedMinutes: duration,
  };
  try {
    const projection = projectSchedule(schedule);
    if (
      projection.date !== localDate ||
      projection.startTime !== clock(startMinute)
    ) {
      return null;
    }
  } catch {
    return null; // Inherited Time Blocks cannot represent this window.
  }
  return { localDate, ...schedule };
}

function findSlot(
  localDate: string,
  duration: number,
  input: NormalizedStudyPlanInput,
  busy: BusyTimeBlock[],
  now: Date,
  dueAt: Date
): StudyPlanSlot | null {
  const dayBusy = busy.filter((block) => block.date === localDate);
  for (
    let start = input.workStartHour * 60;
    start + duration <= input.workEndHour * 60;
    start += 15
  ) {
    const overlaps = dayBusy.some((block) => {
      const blockStart = minutes(block.startTime);
      const blockEnd = minutes(block.endTime);
      if (blockStart === null || blockEnd === null || blockEnd <= blockStart) {
        return true; // Malformed inherited data must not create false availability.
      }
      return start < blockEnd && start + duration > blockStart;
    });
    if (overlaps) continue;
    const slot = candidateSlot(localDate, start, duration, input, now, dueAt);
    if (slot) return slot;
  }
  return null;
}

/** Pure, deterministic placement. Busy blocks are never mutated. */
export function planStudySlots(
  input: NormalizedStudyPlanInput,
  remainingMinutes: number,
  busyBlocks: BusyTimeBlock[],
  dueAt: Date,
  now: Date
): PlannedStudySlots {
  if (!isIanaTimezone(input.timezone)) {
    throw new ValidationError("A valid IANA timezone is required");
  }
  const pending = splitStudyMinutes(
    remainingMinutes,
    input.preferredSessionMinutes
  );
  const days: string[] = [];
  for (
    let date = input.startDate;
    date <= input.endDate && days.length <= 366;
    date = addDaysToDate(date, 1)
  ) {
    days.push(date);
  }
  if (days.length > 366) {
    throw new ValidationError("Planning range cannot exceed 366 days");
  }
  const busy = [...busyBlocks];
  const proposedSlots: StudyPlanSlot[] = [];
  while (pending.length > 0 && proposedSlots.length < 500) {
    let placedThisPass = false;
    for (const date of days) {
      for (let index = 0; index < pending.length; index++) {
        const duration = pending[index]!;
        const slot = findSlot(date, duration, input, busy, now, dueAt);
        if (!slot) continue;
        pending.splice(index, 1);
        proposedSlots.push(slot);
        busy.push({
          date,
          startTime: formatInTimeZone(
            new Date(slot.startAt),
            input.timezone,
            "HH:mm"
          ),
          endTime: formatInTimeZone(
            new Date(slot.endAt),
            input.timezone,
            "HH:mm"
          ),
        });
        placedThisPass = true;
        break;
      }
      if (pending.length === 0 || proposedSlots.length >= 500) break;
    }
    if (!placedThisPass) break;
  }
  proposedSlots.sort((left, right) =>
    left.startAt.localeCompare(right.startAt)
  );
  return {
    proposedSlots,
    plannedMinutes: proposedSlots.reduce(
      (sum, slot) => sum + slot.plannedMinutes,
      0
    ),
    unscheduledMinutes: pending.reduce((sum, duration) => sum + duration, 0),
  };
}
