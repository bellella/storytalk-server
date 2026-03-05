import { z } from 'zod';

const scoreFields = {
  overallScore: z.number().int().min(0).max(100).nullable(),
  grammarScore: z.number().int().min(0).max(100).nullable(),
  fluencyScore: z.number().int().min(0).max(100).nullable(),
  naturalnessScore: z.number().int().min(0).max(100).nullable(),
  cefr: z.string().nullable(),
};

export const EvaluateSlotsResponseZ = z.object({
  turns: z.array(
    z.object({
      index: z.number().int(),
      ...scoreFields,
      feedback: z.string().nullable(),
    })
  ),
  aggregate: z.object({
    ...scoreFields,
    summary: z.string().nullable(),
  }),
});

export type EvaluateSlotsResponse = z.infer<typeof EvaluateSlotsResponseZ>;
