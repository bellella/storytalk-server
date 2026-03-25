export interface EvaluateSlotsPromptArgs {
  turns: {
    index: number;
    userInput: string; // 유저가 실제 입력한 원문
    correctedText: string; // AI가 교정/번역한 텍스트
    inputType: 'correction' | 'translation'; // 영어 입력이면 correction, 한국어면 translation
  }[];
}

/** PromptTemplate용 변수 객체 생성 */
export function prepareEvaluateSlotsVariables(
  args: EvaluateSlotsPromptArgs
): Record<string, string> {
  const turnList = args.turns
    .map((t) =>
      t.inputType === 'correction'
        ? `Turn ${t.index}: original="${t.userInput}" → corrected="${t.correctedText}"`
        : `Turn ${t.index}: (Korean input, translated to) "${t.correctedText}"`
    )
    .join('\n');
  return { turnList };
}

export function buildEvaluateSlotsPrompt(
  args: EvaluateSlotsPromptArgs
): string {
  const turnList = args.turns
    .map((t) =>
      t.inputType === 'correction'
        ? `Turn ${t.index}: original="${t.userInput}" → corrected="${t.correctedText}"`
        : `Turn ${t.index}: (Korean input, translated to) "${t.correctedText}"`
    )
    .join('\n');

  return `You are an English language evaluator for a language learning app.
Evaluate the user's English performance across the following conversation turns.
Only evaluate turns where inputType is "correction" (English input). Skip translation turns in per-turn scores.

Turns:
${turnList}

Respond with ONLY valid JSON. No markdown, no trailing commas.

{
  "turns": [
    {
      "index": 1,
      "overallScore": <0-100>,
      "grammarScore": <0-100>,
      "fluencyScore": <0-100>,
      "naturalnessScore": <0-100>,
      "cefr": "<A1|A2|B1|B2|C1|C2>",
      "feedback": "<Korean feedback on this specific turn>"
    }
  ],
  "aggregate": {
    "overallScore": <0-100>,
    "grammarScore": <0-100>,
    "fluencyScore": <0-100>,
    "naturalnessScore": <0-100>,
    "cefr": "<A1|A2|B1|B2|C1|C2>",
    "summary": "<Korean overall summary of the user's English performance>"
  }
}

RULES:
1. All text fields (feedback, summary) must be written in Korean.
2. Scores are integers 0-100.
3. If there are no English input turns, return "turns": [] and aggregate with all scores null.
4. No trailing commas anywhere.`.trim();
}
