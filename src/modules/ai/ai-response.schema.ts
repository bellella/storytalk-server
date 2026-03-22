import { z } from 'zod';

const TextMessageSchema = z.object({
  type: z.literal('TEXT'),
  content: z.string(),
  translated: z.string(),
});

const StickerMessageSchema = z.object({
  type: z.literal('STICKER'),
  content: z.string(),
});

export const AiResponseSchema = z.object({
  messages: z.array(
    z.discriminatedUnion('type', [TextMessageSchema, StickerMessageSchema])
  ),
  payload: z.record(z.string(), z.string()).optional().default({}),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;
