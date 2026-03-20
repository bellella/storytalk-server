import { CharacterInfo } from '../types/ai.type';

export interface CorrectAndDialoguesPromptArgs {
  userCharacter: CharacterInfo;
  npcCharacters: CharacterInfo[];
  situation: string;
  userText: string;
  dataTable?: Record<string, any> | null;
  dataTablePrompt?: string;
  constraints?: string[];
  messagesInTheScene?: {
    characterName: string;
    englishText: string;
  }[];
}

/** PromptTemplate용 변수 객체 생성 */
export function prepareCorrectAndDialoguesVariables(
  args: CorrectAndDialoguesPromptArgs
): Record<string, string> {
  const constraints = (args.constraints ?? []).map((c) => `- ${c}`).join('\n');
  const npcList = args.npcCharacters
    .map((c) => {
      const personality = c.personality
        ? `, personality="${c.personality}"`
        : '';
      const prompt = c.playEpisodePrompt
        ? `\n  Instructions: ${c.playEpisodePrompt}`
        : '';
      return `- id=${c.characterId}, name="${c.name}"${personality}${prompt}`;
    })
    .join('\n');
  const sceneMessages = args.messagesInTheScene?.length
    ? `\nPrevious messages:\n${args.messagesInTheScene.map((m) => `- ${m.characterName}: ${m.englishText}`).join('\n')}\n`
    : '';
  const userPrompt = args.userCharacter.playEpisodePrompt
    ? `\n  Instructions: ${args.userCharacter.playEpisodePrompt}`
    : '';
  return {
    userCharacterLine: `id=${args.userCharacter.characterId}, name="${args.userCharacter.name}"${args.userCharacter.personality ? `, personality="${args.userCharacter.personality}"` : ''}${userPrompt}`,
    npcList,
    situation: args.situation,
    constraints: constraints ? `Constraints:\n${constraints}\n` : '',
    sceneMessages,
    userText: args.userText,
    dataTablePrompt: args.dataTablePrompt ? `DataTable:\n${args.dataTablePrompt}\n` : '',
    userCharacterId: String(args.userCharacter.characterId),
    userCharacterName: args.userCharacter.name,
  };
}

export function buildCorrectAndDialoguesPrompt(
  args: CorrectAndDialoguesPromptArgs
) {
  const constraints = (args.constraints ?? []).map((c) => `- ${c}`).join('\n');

  const npcList = args.npcCharacters
    .map((c) => {
      const personality = c.personality
        ? `, personality="${c.personality}"`
        : '';
      const prompt = c.playEpisodePrompt
        ? `\n  Instructions: ${c.playEpisodePrompt}`
        : '';
      return `- id=${c.characterId}, name="${c.name}"${personality}${prompt}`;
    })
    .join('\n');

  const sceneMessages = args.messagesInTheScene?.length
    ? `\nPrevious messages:\n${args.messagesInTheScene.map((m) => `- ${m.characterName}: ${m.englishText}`).join('\n')}\n`
    : '';

  const userPrompt = args.userCharacter.playEpisodePrompt
    ? `\n  Instructions: ${args.userCharacter.playEpisodePrompt}`
    : '';
  return `Return ONLY valid JSON. English roleplay learning app.

User: id=${args.userCharacter.characterId}, name="${args.userCharacter.name}"${args.userCharacter.personality ? `, personality="${args.userCharacter.personality}"` : ''}${userPrompt}
NPCs:
${npcList}
Situation: ${args.situation}
${constraints ? `Constraints:\n${constraints}\n` : ''}${sceneMessages}
Input: "${args.userText}"
Step 1 — Detect input language, then branch:
[ENGLISH input] type="correction" — fix grammar/naturalness. If already correct, keep as-is.
[NON-ENGLISH input] type="translation" — translate to natural English.
Step 2 — messages[0]: user's corrected/translated text (characterId=${args.userCharacter.characterId}).
Step 3 — Append 1–4 NPC replies matching each NPC's personality.
${args.dataTablePrompt ? `DataTable:\n${args.dataTablePrompt}\n` : ''}
Message type rules:
- type="DIALOGUE": character speaking (has characterId, characterName, charImageLabel).
- type="NARRATION": narrator action/description (characterId=null, characterName=null).

CRITICAL FIELD RULES — never break these:
- "englishText": ALWAYS written in English, no exceptions. NPC replies must be in English.
- "koreanText": ALWAYS the Korean translation of englishText.
- "charImageLabel": "default"|"happy"|"angry"|"sad" (DIALOGUE only).
- "characterId": must match IDs listed above (DIALOGUE only).
- No trailing commas.

{
  "type": "correction|translation",
  "messages": [
    {
      "type": "DIALOGUE",
      "characterId": ${args.userCharacter.characterId},
      "characterName": "${args.userCharacter.name}",
      "charImageLabel": "default",
      "englishText": "<English: corrected or translated user sentence>",
      "koreanText": "<Korean translation of englishText>"
    },
    {
      "type": "DIALOGUE",
      "characterId": <NPC id (integer)>,
      "characterName": "<NPC name>",
      "charImageLabel": "happy|sad|angry|default",
      "englishText": "<English: NPC reply in English>",
      "koreanText": "<Korean translation of NPC reply>"
    }
  ],
  "dataTable": {}
}`.trim();
}
