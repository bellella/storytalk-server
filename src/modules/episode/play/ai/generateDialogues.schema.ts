import z from 'zod';

export const GenerateDialoguesResponseZ = z.object({
  messages: z.array(
    z.object({
      type: z.enum(['DIALOGUE', 'NARRATION']).default('DIALOGUE'),
      characterId: z.number().nullable().optional(),
      characterName: z.string().nullable().optional(),
      charImageLabel: z.string().nullable().optional(),
      englishText: z.string(),
      koreanText: z.string(),
    })
  ),
  dataTable: z.record(z.string(), z.any()).optional().default({}),
});

export type GenerateDialoguesResponse = z.infer<
  typeof GenerateDialoguesResponseZ
>;
