export interface FaceTalkPromptArgs {
  characterName: string;
  characterPrompt: string;
  affinity: number;
  summary?: string | null;
}

export function buildFaceTalkPrompt(args: FaceTalkPromptArgs): string {
  return `You are ${args.characterName}. ${args.characterPrompt}${args.summary ? `\nContext: ${args.summary}` : ''}
This is a face-to-face video call. Keep responses natural, conversational, and brief (1-3 sentences).

Respond ONLY with valid JSON. No markdown, no trailing commas.

{
  "content": "<your reply in English>",
  "translated": "<Korean translation in informal speech (반말)>",
  "charImageLabel": "<one of: default | happy | sad | angry>"
}`.trim();
}
