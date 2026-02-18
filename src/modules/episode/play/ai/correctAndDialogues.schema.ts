import { z } from 'zod';

export const CorrectAndDialoguesResponseZ = z.object({
  type: z.enum(['correction', 'translation']),
  messages: z
    .array(
      z.object({
        type: z.enum(['DIALOGUE', 'NARRATION']).default('DIALOGUE'),
        characterId: z.number().int().nullable().optional(),
        characterName: z.string().nullable().optional(),
        charImageLabel: z.string().nullable().optional(),
        englishText: z.string().min(1),
        koreanText: z.string().nullable().optional(),
      })
    )
    .min(2)
    .max(10),

  evaluation: z
    .object({
      overallScore: z.number().int().min(0).max(100).nullable().optional(),
      grammarScore: z.number().int().min(0).max(100).nullable().optional(),
      fluencyScore: z.number().int().min(0).max(100).nullable().optional(),
      naturalnessScore: z.number().int().min(0).max(100).nullable().optional(),
      cefr: z.string().nullable().optional(),
      summary: z.string().nullable().optional(),
      feedback: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  dataTable: z.record(z.string(), z.any()).optional().default({}),
});

export type CorrectAndDialoguesResponse = z.infer<
  typeof CorrectAndDialoguesResponseZ
>;
