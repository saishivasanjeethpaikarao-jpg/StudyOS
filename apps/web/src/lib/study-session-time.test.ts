import { afterEach, describe, expect, it } from "vitest";
import {
  formatSessionLocalInput,
  isCalendarBlockOnDay,
  parseSessionLocalInput,
  todaySessionRange,
} from "./study-session-time";

const originalTimezone = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTimezone;
});

describe("Study Session timezone semantics", () => {
  it("keeps the same instant when a New York session is viewed in Tokyo", () => {
    process.env.TZ = "Asia/Tokyo";
    const start = new Date("2030-04-09T22:00:00.000Z");
    expect(formatSessionLocalInput(start, "America/New_York")).toBe(
      "2030-04-09T18:00"
    );
    expect(
      parseSessionLocalInput(
        "2030-04-09T18:00",
        "America/New_York"
      ).toISOString()
    ).toBe(start.toISOString());
    const projection = {
      studySessionId: "session",
      startTime: start,
      endTime: new Date("2030-04-09T22:40:00.000Z"),
    };
    expect(isCalendarBlockOnDay(projection, new Date(2030, 3, 10))).toBe(true);
    expect(isCalendarBlockOnDay(projection, new Date(2030, 3, 9))).toBe(false);
    const today = todaySessionRange(new Date("2030-04-09T23:00:00.000Z"));
    expect(today).toEqual({
      from: "2030-04-09T15:00:00.000Z",
      to: "2030-04-10T15:00:00.000Z",
    });
    expect(start >= new Date(today.from) && start < new Date(today.to)).toBe(
      true
    );
  });

  it("keeps generic Time Blocks on inherited viewer-local date behavior", () => {
    process.env.TZ = "Asia/Tokyo";
    const generic = {
      studySessionId: null,
      startTime: new Date(2030, 3, 9, 18),
      endTime: new Date(2030, 3, 9, 18, 40),
    };
    expect(isCalendarBlockOnDay(generic, new Date(2030, 3, 9))).toBe(true);
    expect(isCalendarBlockOnDay(generic, new Date(2030, 3, 10))).toBe(false);
  });

  it("shows a session on both viewer days if it crosses viewer midnight", () => {
    process.env.TZ = "Asia/Tokyo";
    const projection = {
      studySessionId: "session",
      startTime: new Date("2030-04-09T14:40:00.000Z"),
      endTime: new Date("2030-04-09T15:20:00.000Z"),
    };
    expect(isCalendarBlockOnDay(projection, new Date(2030, 3, 9))).toBe(true);
    expect(isCalendarBlockOnDay(projection, new Date(2030, 3, 10))).toBe(true);
  });

  it("reschedules normal non-DST zones without using the browser zone", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(
      parseSessionLocalInput("2030-04-09T09:00", "Asia/Kolkata").toISOString()
    ).toBe("2030-04-09T03:30:00.000Z");
  });

  it("rejects nonexistent spring-forward and ambiguous fall-back wall times", () => {
    expect(() =>
      parseSessionLocalInput("2025-03-09T02:30", "America/New_York")
    ).toThrow(/does not exist/);
    expect(() =>
      parseSessionLocalInput("2025-11-02T01:30", "America/New_York")
    ).toThrow(/occurs twice/);
    expect(
      parseSessionLocalInput(
        "2025-11-02T03:00",
        "America/New_York"
      ).toISOString()
    ).toBe("2025-11-02T08:00:00.000Z");
  });
});
