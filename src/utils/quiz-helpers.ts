import { z } from 'zod';

// ── 공통 스키마 ──
const TokenSchema = z.object({ id: z.string(), t: z.string() });

// ── SENTENCE_BUILD ──
const SentenceBuildRawSchema = z
  .object({
    promptKorean: z.string().optional(),
    tokensAll: z.array(TokenSchema),
    answerTokenIds: z.array(z.string()),
    settings: z
      .object({
        autoPunctuation: z.object({ append: z.string() }).optional(),
      })
      .optional(),
  })
  .refine(
    (d) => {
      const ids = new Set(d.tokensAll.map((t) => t.id));
      return d.answerTokenIds.every((id) => ids.has(id));
    },
    { message: 'answerTokenIds must reference valid token ids' },
  );

export const SentenceBuildDataSchema = SentenceBuildRawSchema.transform(
  (d) => ({
    promptKorean: d.promptKorean,
    tokensAll: [...d.tokensAll].sort(() => Math.random() - 0.5),
    tokenTextMap: Object.fromEntries(d.tokensAll.map((t) => [t.id, t.t])),
    answerTokenIds: d.answerTokenIds,
    punctuation: d.settings?.autoPunctuation?.append ?? '',
  }),
);

export type SentenceBuildParsed = z.output<typeof SentenceBuildDataSchema>;

// ── SENTENCE_CLOZE_BUILD ──
const TextPartSchema = z.object({ type: z.literal('text'), t: z.string() });
const SlotPartSchema = z.object({
  type: z.literal('slot'),
  slotId: z.string(),
});
const PartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  SlotPartSchema,
]);

const SentenceClozeRawSchema = z
  .object({
    promptKorean: z.string().optional(),
    questionKorean: z.string().optional(),
    parts: z.array(PartSchema),
    choices: z.array(TokenSchema),
    answerBySlot: z.record(z.string(), z.string()),
  })
  .refine(
    (d) => {
      const slotIds = d.parts
        .filter((p): p is z.infer<typeof SlotPartSchema> => p.type === 'slot')
        .map((p) => p.slotId);
      // slot id 중복 없어야 함
      if (new Set(slotIds).size !== slotIds.length) return false;
      // 모든 slot에 answer가 있어야 함
      if (!slotIds.every((sid) => !!d.answerBySlot[sid])) return false;
      // answer가 유효한 choice를 참조해야 함
      const choiceIds = new Set(d.choices.map((c) => c.id));
      return slotIds.every((sid) => choiceIds.has(d.answerBySlot[sid]));
    },
    { message: 'Invalid slot/answer/choice mapping' },
  );

export const SentenceClozeDataSchema = SentenceClozeRawSchema.transform(
  (d) => {
    const slotIds = d.parts
      .filter((p): p is z.infer<typeof SlotPartSchema> => p.type === 'slot')
      .map((p) => p.slotId);

    return {
      promptKorean: d.promptKorean ?? d.questionKorean,
      parts: d.parts,
      choices: d.choices,
      answerBySlot: d.answerBySlot,
      slotIds,
    };
  },
);

export type SentenceClozeParsed = z.output<typeof SentenceClozeDataSchema>;

// ── 파서 함수 ──
export function parseSentenceBuildData(
  data: unknown,
): SentenceBuildParsed | null {
  const result = SentenceBuildDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseSentenceClozeData(
  data: unknown,
): SentenceClozeParsed | null {
  const result = SentenceClozeDataSchema.safeParse(data);
  return result.success ? result.data : null;
}
