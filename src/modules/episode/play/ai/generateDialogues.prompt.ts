import { CharacterInfo } from '../types/ai.type';

export interface GenerateDialoguesPromptArgs {
  userCharacter: CharacterInfo;
  npcCharacters: CharacterInfo[];
  situation: string;
  /** 통째로 넣는 제약 텍스트 (프롬프트에 Constraints: 블록으로 삽입) */
  constraints?: string;
  dataTable: Record<string, any>;
}

/** PromptTemplate용 변수 객체 생성 (key: {{placeholder}}) */
export function prepareGenerateDialoguesVariables(
  args: GenerateDialoguesPromptArgs
): Record<string, string> {
  const constraintsBlock = args.constraints?.trim()
    ? `Constraints:\n${args.constraints.trim()}\n`
    : '';
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
  const userPrompt = args.userCharacter.playEpisodePrompt
    ? `\n  Instructions: ${args.userCharacter.playEpisodePrompt}`
    : '';
  const userLine = `id=${args.userCharacter.characterId}, name="${args.userCharacter.name}"${args.userCharacter.personality ? `, personality="${args.userCharacter.personality}"` : ''}${userPrompt}`;
  return {
    userCharacterLine: userLine,
    npcList,
    situation: args.situation,
    constraints: constraintsBlock,
    dataTable: JSON.stringify(args.dataTable),
  };
}

export function buildGenerateDialoguesPrompt(
  args: GenerateDialoguesPromptArgs
) {
  const constraintsBlock = args.constraints?.trim()
    ? `Constraints:\n${args.constraints.trim()}\n`
    : '';

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

  const userPrompt = args.userCharacter.playEpisodePrompt
    ? `\n  Instructions: ${args.userCharacter.playEpisodePrompt}`
    : '';
  return `Return ONLY valid JSON. English roleplay learning app.
User: id=${args.userCharacter.characterId}, name="${args.userCharacter.name}"${args.userCharacter.personality ? `, personality="${args.userCharacter.personality}"` : ''}${userPrompt}
NPCs:
${npcList}
Situation: ${args.situation}
${constraintsBlock}
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
