import { describe, expect, it, vi } from "vitest";
import { createApi } from "./index.js";

describe("Study Session and Time Block client contracts", () => {
  it("keeps the session link when hydrating a projected Time Block", async () => {
    const customFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "block",
                userId: "owner",
                taskId: null,
                studySessionId: "session",
                sessionStartAt: "2030-04-09T22:00:00.000Z",
                sessionEndAt: "2030-04-09T22:40:00.000Z",
                studySessionTimezone: "America/New_York",
                title: "Study: Mathematics",
                date: "2030-04-09",
                startTime: "18:00",
                endTime: "18:40",
                durationMins: 40,
                color: null,
                position: 0,
                createdAt: "2030-04-01T00:00:00.000Z",
                updatedAt: "2030-04-01T00:00:00.000Z",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } }
        )
    ) as unknown as typeof fetch;
    const api = createApi({ baseUrl: "https://api.test", customFetch });
    const [block] = await api.timeBlocks.list({ date: "2030-04-09" });
    expect(block?.studySessionId).toBe("session");
    expect(block?.taskId).toBeNull();
    expect(block?.startTime.toISOString()).toBe("2030-04-09T22:00:00.000Z");
    expect(block?.endTime.toISOString()).toBe("2030-04-09T22:40:00.000Z");
    expect(block?.studySessionTimezone).toBe("America/New_York");
  });

  it("sends canonical from/to dates and preserves legacy range filter aliases", async () => {
    const urls: URL[] = [];
    const customFetch = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(new URL((input as Request).url));
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const api = createApi({ baseUrl: "https://api.test", customFetch });
    await api.timeBlocks.list({ from: "2030-04-09", to: "2030-04-10" });
    await api.timeBlocks.list({
      startTimeFrom: "2030-04-09",
      startTimeTo: "2030-04-10",
    });
    for (const url of urls) {
      expect(url.searchParams.get("from")).toBe("2030-04-09");
      expect(url.searchParams.get("to")).toBe("2030-04-10");
      expect(url.searchParams.has("startTimeFrom")).toBe(false);
      expect(url.searchParams.has("startTimeTo")).toBe(false);
    }
  });

  it("passes the viewer's absolute calendar window without changing generic date filters", async () => {
    const urls: URL[] = [];
    const customFetch = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(new URL((input as Request).url));
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const api = createApi({ baseUrl: "https://api.test", customFetch });
    await api.timeBlocks.list({
      from: "2030-04-10",
      to: "2030-04-10",
      sessionFrom: "2030-04-09T15:00:00.000Z",
      sessionTo: "2030-04-10T15:00:00.000Z",
      limit: 500,
    });
    expect(urls[0]?.searchParams.get("from")).toBe("2030-04-10");
    expect(urls[0]?.searchParams.get("sessionFrom")).toBe(
      "2030-04-09T15:00:00.000Z"
    );
    expect(urls[0]?.searchParams.get("limit")).toBe("500");
  });

  it("sends a strong If-Match revision for Study Session mutations", async () => {
    const requests: Request[] = [];
    const customFetch = vi.fn(async (input: RequestInfo | URL) => {
      requests.push(input as Request);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "session",
            startAt: "2030-04-09T09:00:00.000Z",
            endAt: "2030-04-09T09:40:00.000Z",
            completedAt: null,
            createdAt: "2030-04-01T00:00:00.000Z",
            updatedAt: "2030-04-01T00:00:00.000Z",
            deletedAt: null,
          },
        }),
        {
          headers: { "content-type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;
    const api = createApi({ baseUrl: "https://api.test", customFetch });
    const session = await api.studySessions.update(
      "session",
      { timezone: "UTC" },
      2
    );
    expect(session.startAt).toBeInstanceOf(Date);
    expect(requests[0]?.headers.get("If-Match")).toBe('"2"');
    expect(new URL(requests[0]!.url).pathname).toBe("/study-sessions/session");
    await expect(api.studySessions.skip("session", 0)).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });
});
