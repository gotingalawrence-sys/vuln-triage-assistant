import { z } from "zod";

export const SEVERITY_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Critical",
  "Unknown",
] as const;

export const triageResultSchema = z.object({
  explanation: z.string().min(1),
  executiveSummary: z.string().min(1),
  riskAssessment: z.object({
    severity: z.enum(SEVERITY_LEVELS),
    rationale: z.string().min(1),
  }),
  remediationSteps: z.array(z.string().min(1)).min(1),
  ticketText: z.string().min(1),
});

export type TriageResult = z.infer<typeof triageResultSchema>;