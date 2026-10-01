import { describe, expect, it, vi } from "vitest";
import { createApi } from "./index.js";

describe("typed Study Plan client", () => {
  it("sends preview and confirmation to Assignment routes and hydrates sessions", async () => {
    const requests: Request[] = [];
    const customFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      requests.push(request);
      return new Response(
        JSON.stringify({
          success: true,
          data:
            requests.length === 1
              ? { assignmentId: "assignment", proposedSlots: [] }
              : {
                  planApplicationId: "application",
                  replayed: false,
                  sessions: [
                    {
                      id: "session",
                      startAt: "2030-04-09T09:00:00.000Z",
                      endAt: "2030-04-09T09:40:00.000Z",
                      createdAt: "2030-04-01T00:00:00.000Z",
                      updatedAt: "2030-04-01T00:00:00.000Z",
                      completedAt: null,
                      deletedAt: null,
                    },
                  ],
                },
        }),
        { headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;
    const api = createApi({ baseUrl: "https://api.test", customFetch });
    await api.assignments.previewStudyPlan("assignment", {
      preferredSessionMinutes: 40,
      timezone: "UTC",
    });
    const result = await api.assignments.confirmStudyPlan("assignment", {
      clientMutationId: "00000000-0000-4000-8000-000000000000",
      assignmentRevision: 1,
      availabilityFingerprint: "a".repeat(64),
      normalizedInput: {
        targetMinutes: 40,
        startDate: "2030-04-09",
        endDate: "2030-04-09",
        preferredSessionMinutes: 40,
        timezone: "UTC",
        workStartHour: 9,
        workEndHour: 18,
      },
      proposedSlots: [],
    });
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/assignments/assignment/study-plan/preview",
      "/assignments/assignment/study-plan/confirm",
    ]);
    expect(result.sessions[0]?.startAt).toBeInstanceOf(Date);
  });
});
