import { z } from 'zod';

export const PickSentencesForQuizResponseZ = z.object({
  results: z.array(
    z.object({
      englishText: z.string(),
      koreanText: z.string(),
      description: z.string(),
    })
  ),
});

export type PickSentencesForQuizResponse = z.infer<
  typeof PickSentencesForQuizResponseZ
>;
