import { CharacterInfo } from '../types/ai.type';

export interface GenerateDialoguesPromptArgs {
  userCharacter: CharacterInfo;
  npcCharacters: CharacterInfo[];
  situation: string;
  constraints?: string[];
  dataTable: Record<string, any>;
}
export function buildGenerateDialoguesPrompt(
  args: GenerateDialoguesPromptArgs
) {
  const constraints = (args.constraints ?? []).map((c) => `- ${c}`).join('\n');

  const npcList = args.npcCharacters
    .map((c) => {
      const personality = c.personality
        ? `, personality="${c.personality}"`
        : '';
      return `- id=${c.characterId}, name="${c.name}"${personality}`;
    })
    .join('\n');

  return `Return ONLY valid JSON. English roleplay learning app.
User: id=${args.userCharacter.characterId}, name="${args.userCharacter.name}"${args.userCharacter.personality ? `, personality="${args.userCharacter.personality}"` : ''}
NPCs:
${npcList}
Situation: ${args.situation}
${constraints ? `Constraints:\n${constraints}\n` : ''}
DataTable:
${JSON.stringify(args.dataTable)}
Message type rules:
- type="DIALOGUE": character speaking directly (has characterId, characterName, charImageLabel).
- type="NARRATION": narrator describing scene/action (no characterId, no characterName needed).

Rules:
- koreanText: required for every message.
- charImageLabel: "default"|"happy"|"angry"|"sad" (DIALOGUE only).
- characterId: must match IDs above (DIALOGUE only).

{
  "messages": [
    {"type":"DIALOGUE","characterId":number,"characterName":"...","charImageLabel":"...","englishText":"...","koreanText":"..."},
    {"type":"NARRATION","characterId":null,"characterName":null,"charImageLabel":null,"englishText":"...","koreanText":"..."}
  ],
  "dataTable": {}
}`.trim();
}
