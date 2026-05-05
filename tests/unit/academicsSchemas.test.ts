import { describe, expect, it } from "vitest";

import {
  assessmentCreateSchema,
  homeworkCreateSchema,
  homeworkStatusSchema,
  learningPlanCreateSchema,
} from "../../lib/schemas/academics";

const STUDENT_ID = "11111111-1111-1111-1111-111111111111";
const TUTOR_ID = "22222222-2222-2222-2222-222222222222";

describe("assessmentCreateSchema", () => {
  it("accepts a minimal valid assessment", () => {
    const out = assessmentCreateSchema.parse({
      studentId: STUDENT_ID,
      subject: "Math",
      title: "Diagnostic 1",
    });
    expect(out.type).toBe("PROGRESS");
    expect(out.skills).toEqual([]);
  });

  it("rejects when only one of score numerator/denominator is provided", () => {
    expect(() =>
      assessmentCreateSchema.parse({
        studentId: STUDENT_ID,
        subject: "Math",
        title: "x",
        scoreNumerator: 5,
      }),
    ).toThrow(/numerator and denominator/i);
  });

  it("accepts a fully scored assessment", () => {
    const out = assessmentCreateSchema.parse({
      studentId: STUDENT_ID,
      tutorId: TUTOR_ID,
      subject: "Math",
      title: "Quiz",
      type: "DIAGNOSTIC",
      scoreNumerator: 8,
      scoreDenominator: 10,
      skills: ["fractions", "ratios", "fractions"],
    });
    expect(out.scoreNumerator).toBe(8);
    expect(out.scoreDenominator).toBe(10);
    expect(out.skills).toEqual(["fractions", "ratios", "fractions"]);
  });

  it("rejects a missing studentId", () => {
    expect(() =>
      assessmentCreateSchema.parse({ subject: "x", title: "x" }),
    ).toThrow();
  });
});

describe("homeworkCreateSchema", () => {
  it("accepts a minimal homework", () => {
    const out = homeworkCreateSchema.parse({
      studentId: STUDENT_ID,
      title: "Worksheet 3",
    });
    expect(out.title).toBe("Worksheet 3");
  });

  it("rejects an invalid dueDate", () => {
    expect(() =>
      homeworkCreateSchema.parse({
        studentId: STUDENT_ID,
        title: "X",
        dueDate: "not-a-date",
      }),
    ).toThrow();
  });
});

describe("homeworkStatusSchema", () => {
  it("requires feedback/grade/score for REVIEWED", () => {
    expect(() =>
      homeworkStatusSchema.parse({
        homeworkId: STUDENT_ID,
        status: "REVIEWED",
      }),
    ).toThrow(/Add feedback/i);
  });

  it("accepts REVIEWED with feedback", () => {
    const out = homeworkStatusSchema.parse({
      homeworkId: STUDENT_ID,
      status: "REVIEWED",
      feedback: "good work",
    });
    expect(out.status).toBe("REVIEWED");
  });

  it("accepts other statuses without scoring fields", () => {
    expect(() =>
      homeworkStatusSchema.parse({
        homeworkId: STUDENT_ID,
        status: "SUBMITTED",
      }),
    ).not.toThrow();
  });
});

describe("learningPlanCreateSchema", () => {
  it("accepts an empty plan", () => {
    const out = learningPlanCreateSchema.parse({
      studentId: STUDENT_ID,
      title: "Algebra fundamentals",
    });
    expect(out.status).toBe("DRAFT");
    expect(out.goals).toEqual([]);
  });

  it("rejects endDate before startDate", () => {
    expect(() =>
      learningPlanCreateSchema.parse({
        studentId: STUDENT_ID,
        title: "x",
        startDate: "2026-05-10T00:00:00Z",
        endDate: "2026-05-09T00:00:00Z",
      }),
    ).toThrow(/endDate/);
  });

  it("normalises goals", () => {
    const out = learningPlanCreateSchema.parse({
      studentId: STUDENT_ID,
      title: "x",
      goals: [{ id: "a", title: "Master fractions" }],
    });
    expect(out.goals[0]?.done).toBe(false);
  });
});
