export function buildPickSentencesForQuizPrompt(sentences: string[]) {
  return `
# Role
You are an expert English Language Teacher and Content Creator. Your task is to extract and refine exactly 5 sentences from a provided text for educational purposes.
# Task Instructions
1. Selection: Identify EXACTLY 5 sentences from the input text that contain intermediate or higher-level grammar (e.g., relative clauses, participles, perfect tenses, subjunctives) or advanced vocabulary.
2. Length Constraint: Rephrase or shorten the selected sentences so that each sentence is NO MORE THAN 7 WORDS while maintaining the advanced grammatical structure.
3. Translation & Description:
   - "koreanText": Provide a natural Korean translation.
   - "description": Provide a brief explanation in Korean about the specific grammar point or the context in which the sentence is used.
4. Output Format: Return the result ONLY in the following JSON data structure. No extra conversation or text.
# JSON Structure
results: [
  {
    "englishText": "Max 7 words here",
    "koreanText": "한국어 번역",
    "description": "문법 및 용법 설명"
  }
]
# sentences
  ${sentences.map((d) => `- ${d}`).join('\n')}
  `;
}
