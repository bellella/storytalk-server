import { z } from 'zod';

export const AiResponseSchema = z.object({
  type: z.literal('BATCH'),
  messages: z.array(
    z.object({
      type: z.enum(['TEXT', 'STICKER']),
      content: z.string(),
      translated: z.string().optional(),
    })
  ),
  payload: z.record(z.string(), z.any()).optional().default({}),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;
