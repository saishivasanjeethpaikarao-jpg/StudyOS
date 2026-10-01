import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import type { NormalizedStudyPlanInput } from "@open-sunsama/types";
import {
  planStudySlots,
  splitStudyMinutes,
  type BusyTimeBlock,
} from "./study-plan-planner.js";

const input: NormalizedStudyPlanInput = {
  targetMinutes: 120,
  startDate: "2030-04-09",
  endDate: "2030-04-11",
  preferredSessionMinutes: 40,
  timezone: "UTC",
  workStartHour: 9,
  workEndHour: 18,
};
const now = new Date("2030-04-08T12:00:00.000Z");
const due = new Date("2030-04-12T18:00:00.000Z");
const plan = (
  remaining: number,
  changes: Partial<NormalizedStudyPlanInput> = {},
  busy: BusyTimeBlock[] = [],
  current = now,
  deadline = due
) =>
  planStudySlots({ ...input, ...changes }, remaining, busy, deadline, current);

describe("deterministic Study Plan placement", () => {
  it("splits exact effort and rebalances a short final remainder", () => {
    expect(splitStudyMinutes(120, 40)).toEqual([40, 40, 40]);
    expect(splitStudyMinutes(125, 40)).toEqual([40, 40, 30, 15]);
    expect(splitStudyMinutes(75, 40)).toEqual([40, 35]);
    expect(splitStudyMinutes(8, 40)).toEqual([8]);
    expect(splitStudyMinutes(0, 40)).toEqual([]);
    // A 15-minute cap makes a sub-15 remainder unavoidable for 29 minutes.
    expect(splitStudyMinutes(29, 15)).toEqual([15, 14]);
  });

  it("prefers one session per day, then additional passes", () => {
    const acrossDays = plan(120);
    expect(acrossDays.proposedSlots.map((slot) => slot.localDate)).toEqual([
      "2030-04-09",
      "2030-04-10",
      "2030-04-11",
    ]);
    expect(acrossDays.proposedSlots.map((slot) => slot.plannedMinutes)).toEqual(
      [40, 40, 40]
    );
    expect(acrossDays.unscheduledMinutes).toBe(0);

    const oneDay = plan(120, { endDate: "2030-04-09" });
    expect(oneDay.proposedSlots.map((slot) => slot.startAt)).toEqual([
      "2030-04-09T09:00:00.000Z",
      "2030-04-09T09:45:00.000Z",
      "2030-04-09T10:30:00.000Z",
    ]);
  });

  it("respects generic and Study Session busy projections", () => {
    const busy = [
      { date: "2030-04-09", startTime: "09:00", endTime: "10:00" },
      { date: "2030-04-10", startTime: "09:00", endTime: "09:40" },
    ];
    expect(
      plan(80, {}, busy).proposedSlots.map((slot) => slot.startAt)
    ).toEqual(["2030-04-09T10:00:00.000Z", "2030-04-10T09:45:00.000Z"]);
  });

  it("returns exact unscheduled effort without work-hour overflow", () => {
    const exhausted = plan(
      80,
      { endDate: "2030-04-09", workStartHour: 9, workEndHour: 10 },
      [{ date: "2030-04-09", startTime: "09:00", endTime: "09:30" }]
    );
    expect(exhausted.proposedSlots).toEqual([]);
    expect(exhausted.unscheduledMinutes).toBe(80);
    const partial = plan(80, {
      endDate: "2030-04-09",
      workStartHour: 9,
      workEndHour: 10,
    });
    expect(partial.plannedMinutes).toBe(40);
    expect(partial.unscheduledMinutes).toBe(40);
  });

  it("never proposes past slots or a session ending at/after dueAt", () => {
    const future = plan(
      40,
      { endDate: "2030-04-09" },
      [],
      new Date("2030-04-09T10:01:00Z")
    );
    expect(future.proposedSlots[0]?.startAt).toBe("2030-04-09T10:15:00.000Z");
    const cutoff = plan(
      80,
      { endDate: "2030-04-09" },
      [],
      now,
      new Date("2030-04-09T10:00:00Z")
    );
    expect(cutoff.plannedMinutes).toBe(40);
    expect(cutoff.unscheduledMinutes).toBe(40);
    expect(
      plan(
        40,
        { endDate: "2030-04-09" },
        [],
        now,
        new Date("2030-04-09T09:40:00Z")
      ).proposedSlots
    ).toEqual([]);
  });

  it("rejects invalid timezones and avoids unrepresentable DST windows", () => {
    expect(() => plan(40, { timezone: "+05:30" })).toThrow();
    expect(() => plan(40, { timezone: "No/Such_Zone" })).toThrow();
    const spring = plan(
      120,
      {
        startDate: "2030-03-10",
        endDate: "2030-03-10",
        timezone: "America/New_York",
        workStartHour: 1,
        workEndHour: 4,
      },
      [],
      new Date("2030-03-09T12:00:00Z"),
      new Date("2030-03-11T00:00:00Z")
    );
    expect(
      spring.proposedSlots.every((slot) => slot.localDate === "2030-03-10")
    ).toBe(true);
    expect(spring.proposedSlots).toHaveLength(2);
    expect(spring.unscheduledMinutes).toBe(40);
    expect(spring.plannedMinutes + spring.unscheduledMinutes).toBe(120);
    expect(
      spring.proposedSlots.every(
        (slot) =>
          !formatInTimeZone(
            new Date(slot.startAt),
            "America/New_York",
            "HH:mm"
          ).startsWith("02:")
      )
    ).toBe(true);
  });

  it("does not choose a repeated fall-back wall time without an offset choice", () => {
    const fall = plan(
      80,
      {
        startDate: "2025-11-02",
        endDate: "2025-11-02",
        timezone: "America/New_York",
        workStartHour: 1,
        workEndHour: 3,
      },
      [],
      new Date("2025-11-01T12:00:00Z"),
      new Date("2025-11-03T12:00:00Z")
    );
    expect(
      fall.proposedSlots.every(
        (slot) =>
          !formatInTimeZone(
            new Date(slot.startAt),
            "America/New_York",
            "HH:mm"
          ).startsWith("01:")
      )
    ).toBe(true);
  });
});
