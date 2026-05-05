import { describe, expect, it } from "vitest";

import {
  sessionCreateSchema,
  sessionStatusSchema,
  sessionUpdateSchema,
} from "@/lib/schemas/session";

const baseCreate = {
  studentId: "11111111-1111-4111-8111-111111111111",
  tutorId: "22222222-2222-4222-8222-222222222222",
  subject: "Math",
  startTime: "2026-05-04T15:00:00Z",
  endTime: "2026-05-04T16:00:00Z",
};

describe("sessionCreateSchema", () => {
  it("accepts a valid window", () => {
    expect(sessionCreateSchema.safeParse(baseCreate).success).toBe(true);
  });

  it("rejects endTime <= startTime", () => {
    const r = sessionCreateSchema.safeParse({
      ...baseCreate,
      endTime: baseCreate.startTime,
    });
    expect(r.success).toBe(false);
  });

  it("rejects bad uuids", () => {
    expect(
      sessionCreateSchema.safeParse({ ...baseCreate, studentId: "x" }).success,
    ).toBe(false);
    expect(
      sessionCreateSchema.safeParse({ ...baseCreate, tutorId: "x" }).success,
    ).toBe(false);
  });

  it("rejects unparseable times", () => {
    expect(
      sessionCreateSchema.safeParse({ ...baseCreate, startTime: "yesterday" })
        .success,
    ).toBe(false);
  });

  it("accepts optional Meet URL", () => {
    expect(
      sessionCreateSchema.safeParse({
        ...baseCreate,
        googleMeetUrl: "https://meet.google.com/abc-defg-hij",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed Meet URL", () => {
    expect(
      sessionCreateSchema.safeParse({
        ...baseCreate,
        googleMeetUrl: "not a url",
      }).success,
    ).toBe(false);
  });
});

describe("sessionUpdateSchema", () => {
  it("accepts partial updates", () => {
    expect(sessionUpdateSchema.safeParse({ subject: "Physics" }).success).toBe(
      true,
    );
  });

  it("rejects times where end <= start when both supplied", () => {
    expect(
      sessionUpdateSchema.safeParse({
        startTime: "2026-05-04T16:00:00Z",
        endTime: "2026-05-04T15:00:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("sessionStatusSchema", () => {
  it("requires uuid + valid status", () => {
    expect(
      sessionStatusSchema.safeParse({ sessionId: "x", status: "SCHEDULED" })
        .success,
    ).toBe(false);
    expect(
      sessionStatusSchema.safeParse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        status: "BOGUS",
      }).success,
    ).toBe(false);
    expect(
      sessionStatusSchema.safeParse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        status: "COMPLETED",
      }).success,
    ).toBe(true);
  });
});
