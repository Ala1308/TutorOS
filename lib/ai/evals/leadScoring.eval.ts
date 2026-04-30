import type {
  LeadScoringInput,
  LeadScoringOutput,
} from "@/lib/ai/schemas/leadScoring";

/**
 * Eval fixtures for leadScoring. The eval runner (`scripts/run-eval.ts`)
 * loads these and runs each input through `runAgent`, asserting that the
 * output satisfies the corresponding `expect` predicate.
 *
 * Add cases as the agent's responsibilities grow. Use synthetic data only.
 */
export interface EvalCase<I, O> {
  name: string;
  input: I;
  expect: (output: O) => { ok: boolean; reason?: string };
}

export const cases: EvalCase<LeadScoringInput, LeadScoringOutput>[] = [
  {
    name: "well-formed inquiry scores >= 70 with LOW risk",
    input: {
      parentName: "Marie L.",
      parentEmail: "marie@example.com",
      parentPhone: "+1-514-555-0100",
      studentGrade: "Grade 10",
      subjectNeeded: "Math",
      message: "Looking for weekly help with functions and trig before exams.",
      source: "WEBSITE",
    },
    expect: (o) => ({
      ok: o.score >= 70 && o.riskLevel === "LOW",
      reason: `score=${o.score} risk=${o.riskLevel}`,
    }),
  },
  {
    name: "vague inquiry scores < 50 and requires approval",
    input: {
      parentName: "John",
      subjectNeeded: "help",
      message: "",
    },
    expect: (o) => ({
      ok: o.score < 50 && o.requiresHumanApproval,
      reason: `score=${o.score} requiresApproval=${o.requiresHumanApproval}`,
    }),
  },
  {
    name: "crisis content elevates risk to CRITICAL",
    input: {
      parentName: "Anonymous",
      parentEmail: "p@example.com",
      studentGrade: "Grade 8",
      subjectNeeded: "Math",
      message: "My child is severely depressed and refusing school.",
    },
    expect: (o) => ({
      ok: o.riskLevel === "CRITICAL" && o.requiresHumanApproval,
      reason: `risk=${o.riskLevel}`,
    }),
  },
];
