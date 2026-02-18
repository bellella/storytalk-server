import { CharacterInfo } from '../types/ai.type';

export type ReplyMode = 'auto' | 'specific' | 'round_robin';

export interface CorrectAndDialoguesPromptArgs {
  userCharacter: CharacterInfo;
  npcCharacters: CharacterInfo[];
  situation: string;
  userText: string;
  replyMode: ReplyMode;
  dataTable?: Record<string, any> | null;
  dataTablePrompt?: string;
  responderIds?: number[];
  constraints?: string[];
  messagesInTheScene?: {
    characterName: string;
    englishText: string;
  }[];
}

export function buildCorrectAndDialoguesPrompt(
  args: CorrectAndDialoguesPromptArgs
) {
  const constraints = (args.constraints ?? []).map((c) => `- ${c}`).join('\n');

  const npcList = args.npcCharacters
    .map((c) => {
      const mustReply =
        args.replyMode === 'specific' &&
        args.responderIds?.includes(c.characterId)
          ? ' [MUST REPLY]'
          : '';
      const personality = c.personality
        ? `, personality="${c.personality}"`
        : '';
      return `- id=${c.characterId}, name="${c.name}"${personality}${mustReply}`;
    })
    .join('\n');

  const replyInstruction = {
    auto: 'Choose which NPC(s) reply based on context.',
    specific: 'Only NPC(s) marked [MUST REPLY] respond.',
    round_robin: 'Pick the next NPC in order.',
  }[args.replyMode];

  const sceneMessages = args.messagesInTheScene?.length
    ? `\nPrevious messages:\n${args.messagesInTheScene.map((m) => `- ${m.characterName}: ${m.englishText}`).join('\n')}\n`
    : '';

  return `Return ONLY valid JSON. English roleplay learning app.

User: id=${args.userCharacter.characterId}, name="${args.userCharacter.name}"${args.userCharacter.personality ? `, personality="${args.userCharacter.personality}"` : ''}
NPCs:
${npcList}
Situation: ${args.situation}
Reply mode: ${replyInstruction}
${constraints ? `Constraints:\n${constraints}\n` : ''}${sceneMessages}
Input: "${args.userText}"
Step 1 — Detect input language, then branch:
[ENGLISH input]
- type="correction", correct grammar/naturalness. If already good, keep as-is.
- "evaluation": REQUIRED object (all fields in Korean).
[NON-ENGLISH input (Korean etc.)]
- type="translation", translate to natural English.
- "evaluation": MUST be null. Do NOT evaluate. Do NOT generate evaluation object.
Step 2 — messages[0] characterId=${args.userCharacter.characterId}.
Step 3 — Append 1–4 NPC replies (kind="reply"), matching each NPC's personality.
${args.dataTablePrompt ? `DataTable:\n${args.dataTablePrompt}\n` : ''}
Message type rules:
- type="DIALOGUE": character is speaking directly (has characterId, characterName, charImageLabel).
- type="NARRATION": narrator describing a scene/action (no characterId, no characterName, no charImageLabel needed).

Rules:
- koreanText: required for every message.
- charImageLabel: "default"|"happy"|"angry"|"sad" (DIALOGUE only).
- characterId: must match IDs above (DIALOGUE only).

{
  "type": "correction|translation",
  "messages": [
    {"type":"DIALOGUE","characterId":${args.userCharacter.characterId},"characterName":"${args.userCharacter.name}","charImageLabel":"...","kind":"correction|translation","englishText":"...","koreanText":"..."},
    {"type":"NARRATION","characterId":null,"characterName":null,"charImageLabel":null,"kind":"reply","englishText":"...","koreanText":"..."},
    {"type":"DIALOGUE","characterId":number,"characterName":"...","charImageLabel":"...","kind":"reply","englishText":"...","koreanText":"..."}
  ],
  "evaluation":{"feedback":"한국어","overallScore":0-100,"grammarScore":0-100,"fluencyScore":0-100,"naturalnessScore":0-100,"cefr":"A1-C2","summary":"한국어"} or null,
  "dataTable": {}
}`.trim();
}
