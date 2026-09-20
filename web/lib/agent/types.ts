import { z } from "zod";

export const DISCLAIMER =
  "Estimación generada por IA, no garantía de elegibilidad. Verifica siempre en el link oficial.";

export type Opportunity = {
  id: string;
  name: string;
  funder: string;
  type: string; // grant | premio | credito | aceleradora ...
  region: string;
  focus: string;
  eligibility_summary: string;
  official_url: string;
  is_demo: boolean;
};

export const MatchSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      fit_score: z.number(),
      rationale: z.string(),
      gaps: z.array(z.string()),
    }),
  ),
});

export const PitchSchema = z.object({
  drafts: z.array(
    z.object({
      opportunity_id: z.string(),
      mvp: z.string(),
      budget: z.array(z.object({ item: z.string(), amount_usd: z.number() })),
      pitch: z.string(),
    }),
  ),
});

export class AgentError extends Error {
  constructor(
    public code: "not_configured" | "refusal" | "bad_output" | "upstream",
    message: string,
  ) {
    super(message);
  }
}
