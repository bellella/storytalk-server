import { z } from 'zod';

export const AiResponseSchema = z.object({
  type: z.enum(['CHAT', 'GRAMMAR_CORRECTION', 'TRANSLATION']),
  message: z.string(),
  data: z.record(z.string(), z.any()).optional().default({}),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;
